// Proxy ATM Milano per ESP32 - v3
const https = require('https');
const http  = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  if (urlObj.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('ATM Proxy v3 OK');
    return;
  }

  if (urlObj.pathname !== '/atm') {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('Not found');
    return;
  }

  const linea   = urlObj.searchParams.get('linea')   || '??';
  const fermata = urlObj.searchParams.get('fermata') || '??';

  const targetPath =
    `/proxy.tpportal/api/tpMob/StopMonitoring` +
    `?codiceLinea=${linea}&codiceEnte=ATM&codiceFermata=${fermata}`;

  const options = {
    hostname: 'giromilano.atm.it',
    path:     targetPath,
    method:   'GET',
    headers: {
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
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      console.log(`[${new Date().toISOString()}] ${linea}@${fermata} → ATM ha risposto: ${proxyRes.statusCode} (${body.length} bytes)`);

      let rispostaFinale;

      if (proxyRes.statusCode === 200 && body.length > 10) {
        // ATM ha risposto bene: manda il JSON reale
        rispostaFinale = body;
        console.log('Dati reali ATM inviati all ESP32');
      } else {
        // ATM ha bloccato (403 o risposta vuota): manda dati FINTI per test
        console.log(`ATM ha bloccato (${proxyRes.statusCode}). Mando dati finti.`);
        rispostaFinale = JSON.stringify({
          "_fake": true,
          "_atm_status": proxyRes.statusCode,
          "Lines": [
            {
              "LineCode": linea,
              "Waits": [
                { "WaitMessage": "5 min" }
              ]
            }
          ]
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
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Errore proxy:', e.message);
    // Anche in caso di errore di rete manda dati finti
    const fake = JSON.stringify({
      "_fake": true,
      "_error": e.message,
      "Lines": [{ "LineCode": linea, "Waits": [{ "WaitMessage": "9 min" }] }]
    });
    const buf = Buffer.from(fake, 'utf8');
    res.writeHead(200, {
      'Content-Type':   'application/json',
      'Content-Length': buf.length,
      'Connection':     'close',
    });
    res.end(buf);
  });

  proxyReq.end();

}).listen(PORT, () => {
  console.log(`Proxy ATM v3 avviato sulla porta ${PORT}`);
});
