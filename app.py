from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    linea = request.args.get('linea', '').strip()
    fermata = request.args.get('fermata', '').strip()
    
    # Pulizia parametri
    linea = ''.join(filter(str.isalnum, linea))
    fermata = ''.join(filter(str.isdigit, fermata))
    
    # Usiamo l'endpoint StopMonitoring ufficiale del portale mobile ATM
    url = f"https://giromilano.atm.it/proxy.tpportal/api/tpMob/StopMonitoring?codiceLinea={linea}&codiceEnte=ATM&codiceFermata={fermata}"
    
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://giromilano.atm.it",
        "Referer": "https://giromilano.atm.it/"
    }
    
    try:
        response = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({
            "error": str(e), 
            "status_code": getattr(response, 'status_code', None),
            "text_restituito": getattr(response, 'text', 'Nessuna risposta')
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
