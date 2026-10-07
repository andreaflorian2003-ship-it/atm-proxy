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
        s = requests.Session()
        # Header completi da browser reale
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Origin": "https://giromilano.atm.it",
            "Referer": "https://giromilano.atm.it/"
        }
        
        # Endpoint con tutti i parametri formali
        url = f"https://giromilano.atm.it/proxy.tpportal/api/tpMob/StopMonitoring?codiceLinea={linea}&codiceEnte=ATM&codiceFermata={fermata}"
        
        response = s.get(url, headers=headers, impersonate="chrome120", timeout=15)
        return jsonify(response.json())
        
    except Exception as e:
        return jsonify({
            "error": str(e), 
            "status_code": getattr(response, 'status_code', None) if 'response' in locals() else None,
            "text_restituito": getattr(response, 'text', 'Nessuna risposta') if 'response' in locals() else 'Errore'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
