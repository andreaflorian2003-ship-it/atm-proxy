# Proxy ATM Milano per ESP32 – Python + curl_cffi
# Bypassa Akamai fingendosi Chrome

from curl_cffi import requests as cffi_requests
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json, os

PORT = int(os.environ.get("PORT", 3000))

# URL che funziona (scoperto dal tuo amico!)
API = "https://giromilano.atm.it/proxy.tpportal/api/tpPortal/geodata/pois/stops/{}"
HEADERS = {
    "Referer": "https://giromilano.atm.it/",
    "Origin":  "https://giromilano.atm.it"
}

# Sessione Chrome persistente
session = cffi_requests.Session(impersonate="chrome")

def get_minuti(codice_fermata, codice_linea):
    try:
        r = session.get(API.format(codice_fermata), headers=HEADERS, timeout=15)
        r.raise_for_status()
        dati = r.json()
        for l in dati.get("Lines", []):
            if l["Line"]["LineCode"] == codice_linea:
                wait = l.get("WaitMessage") or "N/D"
                return {
                    "Lines": [{
                        "LineCode": codice_linea,
                        "Waits": [{"WaitMessage": wait}]
                    }]
                }
        return {"Lines": []}
    except Exception as e:
        return {"_error": str(e), "Lines": []}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ATM Proxy Python OK")
            return

        if parsed.path != "/atm":
            self.send_response(404)
            self.end_headers()
            return

        linea   = params.get("linea",   ["??"])[0]
        fermata = params.get("fermata", ["??"])[0]

        print(f"Richiesta: linea={linea} fermata={fermata}")
        risultato = get_minuti(fermata, linea)
        body = json.dumps(risultato).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(format % args)

if __name__ == "__main__":
    print(f"Proxy ATM Python avviato sulla porta {PORT}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
