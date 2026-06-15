// Proxy ATM Milano per ESP32 - v5 (codici fermata corretti)
const https = require('https');
const http  = require('http');

const PORT = process.env.PORT || 3000;

let cookieCache = '';
let cookieTimestamp = 0;
const COOKIE_TTL = 10 * 60 * 1000;

function ottieniCookie() {
  return new Promise((resolve) => {
    if (cookieCache && (Date.now() - cookieTimestamp < COOKIE_TTL)) {
      resolve(cookieCache);
      return;
    }
    console.log('Ottengo cookie dalla homepage ATM...');
    const options = {
      hostname: 'giromilano.atm.it',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    };
    const req = https.request(options, (res) => {
      const setCookieHeaders = res.headers['set-cookie'] || [];
      const cookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
      console.log(`Cookie: ${cookies || '(nessuno)'}`);
      cookieCache = cookies;
      cookieTimestamp = Date.now();
      res.on('data', () => {});
      res.on('end', () => resolve(cookies));
    });
    req.on('error', (e) => { console.error('Errore cookie:', e.message); resolve(''); });
    req.end();
  });
}

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

    const req = https.request({ hostname: 'giromilano.atm.it', path: targetPath, method: 'GET', headers }, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        console.log(`ATM ${linea}@${fermata} → ${res.statusCode} (${body.length} bytes)`);
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', (e) => { console.error('Errore ATM:', e.message); resolve({ status: 0, body: '' }); });
    req.end();
  });
}

http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  if (urlObj.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('ATM Proxy v5 OK');
    return;
  }

  if (urlObj.pathname !== '/atm') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const linea   = urlObj.searchParams.get('linea')   || '??';
  const fermata = urlObj.searchParams.get('fermata') || '??';

  const cookie = await ottieniCookie();
  const { status, body } = await richiedeDatiATM(linea, fermata, cookie);

  let rispostaFinale;
  if (status === 200 && body.length > 10 && body.trim().startsWith('{')) {
    rispostaFinale = body;
    console.log('✅ Dati REALI inviati');
  } else {
    console.log(`⚠️  Fallback finto (ATM status: ${status})`);
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
  console.log(`Proxy ATM v5 avviato sulla porta ${PORT}`);
});
