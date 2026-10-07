from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    linea = request.args.get('linea', '').strip()
    fermata = request.args.get('fermata', '').strip()
    
    linea = ''.join(filter(str.isalnum, linea))
    fermata = ''.join(filter(str.isdigit, fermata))
    
    try:
        # Usiamo una Sessione: così prima visitiamo la home per "ingannare" Akamai con i cookie, poi chiediamo i dati
        s = requests.Session()
        
        # 1. Visita la home page per raccogliere i cookie di sicurezza
        s.get("https://giromilano.atm.it/", impersonate="chrome", timeout=10)
        
        # 2. Richiesta dei dati veri e propri usando la stessa sessione
        url = f"https://giromilano.atm.it/proxy.tpportal/api/tpMob/StopMonitoring?codiceLinea={linea}&codiceEnte=ATM&codiceFermata={fermata}"
        headers = {
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://giromilano.atm.it",
            "Referer": "https://giromilano.atm.it/"
        }
        
        response = s.get(url, headers=headers, impersonate="chrome", timeout=15)
        return jsonify(response.json())
        
    except Exception as e:
        return jsonify({
            "error": str(e), 
            "status_code": getattr(response, 'status_code', None) if 'response' in locals() else None,
            "text_restituito": getattr(response, 'text', 'Nessuna risposta') if 'response' in locals() else 'Errore connessione'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
