// Proxy ATM Milano per ESP32
// Gira su Node.js (Render.com, Railway, ecc.)

const https = require('https');
const http  = require('http');

const PORT = process.env.PORT || 3000;

// Fermata e linea vengono passate come parametri nell'URL
// Esempio: /atm?linea=40&fermata=13504
http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  // Health check – Render lo usa per sapere se il server è vivo
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
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      // Rigira la risposta all'ESP32
      res.writeHead(proxyRes.statusCode, {
        'Content-Type':  'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
      console.log(`[${new Date().toISOString()}] ${linea}@${fermata} → ${proxyRes.statusCode}`);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Errore proxy:', e.message);
    res.writeHead(502);
    res.end('Errore proxy: ' + e.message);
  });

  proxyReq.end();

}).listen(PORT, () => {
  console.log(`Proxy ATM in ascolto sulla porta ${PORT}`);
});
