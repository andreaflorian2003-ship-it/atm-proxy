// Proxy ATM Milano per ESP32 - v4 (con gestione cookie)
const https = require('https');
const http  = require('http');

const PORT = process.env.PORT || 3000;

// Cookie salvato in memoria (si aggiorna automaticamente)
let cookieCache = '';
let cookieTimestamp = 0;
const COOKIE_TTL = 10 * 60 * 1000; // rinnova il cookie ogni 10 minuti

// ── Step 1: visita la homepage per ottenere i cookie di sessione ──
function ottieniCookie() {
  return new Promise((resolve) => {
    // Se il cookie è ancora valido, riusalo
    if (cookieCache && (Date.now() - cookieTimestamp < COOKIE_TTL)) {
      console.log('Cookie in cache, riuso.');
      resolve(cookieCache);
      return;
    }

    console.log('Ottengo nuovo cookie dalla homepage ATM...');
    const options = {
      hostname: 'giromilano.atm.it',
      path:     '/',
      method:   'GET',
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection':      'keep-alive',
      }
    };

    const req = https.request(options, (res) => {
      // Raccoglie tutti i Set-Cookie
      const setCookieHeaders = res.headers['set-cookie'] || [];
      const cookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
      console.log(`Cookie ottenuto: ${cookies || '(nessuno)'}`);
      cookieCache = cookies;
      cookieTimestamp = Date.now();

      // Svuota il body (non ci interessa)
      res.on('data', () => {});
      res.on('end', () => resolve(cookies));
    });

    req.on('error', (e) => {
      console.error('Errore ottenimento cookie:', e.message);
      resolve(''); // continua anche senza cookie
    });

    req.end();
  });
}

// ── Step 2: richiede i dati ATM con il cookie ──
function richiedeDatiATM(linea, fermata, cookie) {
  return new Promise((resolve) => {
    const targetPath =
      `/proxy.tpportal/api/tpMob/StopMonitoring` +
      `?codiceLinea=${linea}&codiceEnte=ATM&codiceFermata=${fermata}`;

    const headers = {
      'Host':            'giromilano.atm.it',
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'application/json, text/plain, */*',
      'Accept-Language': 'it-IT,it;q=0.9',
      'Accept-Encoding': 'identity',
      'Origin':          'https://giromilano.atm.it',
      'Referer':         'https://giromilano.atm.it/',
      'sec-fetch-dest':  'empty',
      'sec-fetch-mode':  'cors',
      'sec-fetch-site':  'same-origin',
      'Cache-Control':   'no-cache',
      'Connection':      'keep-alive',
    };

    if (cookie) headers['Cookie'] = cookie;

    const options = {
      hostname: 'giromilano.atm.it',
      path:     targetPath,
      method:   'GET',
      headers:  headers,
    };

    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        console.log(`ATM ${linea}@${fermata} → ${res.statusCode} (${body.length} bytes)`);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (e) => {
      console.error('Errore richiesta ATM:', e.message);
      resolve({ status: 0, body: '' });
    });

    req.end();
  });
}

// ── Server principale ──
http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  if (urlObj.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('ATM Proxy v4 OK');
    return;
  }

  if (urlObj.pathname !== '/atm') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const linea   = urlObj.searchParams.get('linea')   || '??';
  const fermata = urlObj.searchParams.get('fermata') || '??';

  // 1. Ottieni cookie
  const cookie = await ottieniCookie();

  // 2. Richiedi dati con cookie
  const { status, body } = await richiedeDatiATM(linea, fermata, cookie);

  let rispostaFinale;

  if (status === 200 && body.length > 10 && body.trim().startsWith('{')) {
    // Dati reali ricevuti!
    rispostaFinale = body;
    console.log('✅ Dati REALI inviati all ESP32');
  } else {
    // Fallback con dati finti
    console.log(`⚠️  ATM ha bloccato (${status}), mando dati finti`);
    rispostaFinale = JSON.stringify({
      "_fake": true,
      "_atm_status": status,
      "Lines": [{ "LineCode": linea, "Waits": [{ "WaitMessage": "5 min" }] }]
    });
  }

  const buf = Buffer.from(rispostaFinale, 'utf8');
  res.writeHead(200, {
    'Content-Type':                'application/json; charset=utf-8',
    'Content-Length':              buf.length,
    'Access-Control-Allow-Origin': '*',
    'Connection':                  'close',
  });
  res.end(buf);

}).listen(PORT, () => {
  console.log(`Proxy ATM v4 avviato sulla porta ${PORT}`);
});
