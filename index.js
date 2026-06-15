// Proxy ATM Milano per ESP32 - v2 (no chunked encoding)
const https = require('https');
const http  = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  if (urlObj.pathname === '/') {
    res.writeHead(200);
    res.end('ATM Proxy OK');
    return;
  }

  if (urlObj.pathname !== '/atm') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const linea   = urlObj.searchParams.get('linea');
  const fermata = urlObj.searchParams.get('fermata');

  if (!linea || !fermata) {
    res.writeHead(400);
    res.end('Parametri mancanti: usa ?linea=40&fermata=13504');
    return;
  }

  const targetPath = `/proxy.tpportal/api/tpMob/StopMonitoring` +
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
    // Raccoglie TUTTI i dati prima di rispondere
    let chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      console.log(`[${new Date().toISOString()}] ${linea}@${fermata} → ${proxyRes.statusCode} (${body.length} bytes)`);

      // Risponde in UNA SOLA volta con Content-Length esplicito
      // Questo evita il chunked encoding che confonde l'ESP32
      const bodyBuffer = Buffer.from(body, 'utf8');
      res.writeHead(proxyRes.statusCode, {
        'Content-Type':                'application/json',
        'Content-Length':              bodyBuffer.length,
        'Access-Control-Allow-Origin': '*',
        'Connection':                  'close',
      });
      res.end(bodyBuffer);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Errore proxy:', e.message);
    const msg = Buffer.from('Errore proxy: ' + e.message, 'utf8');
    res.writeHead(502, {
      'Content-Type':   'text/plain',
      'Content-Length': msg.length,
      'Connection':     'close',
    });
    res.end(msg);
  });

  proxyReq.end();

}).listen(PORT, () => {
  console.log(`Proxy ATM v2 in ascolto sulla porta ${PORT}`);
});
