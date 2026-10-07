from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    # Estraiamo solo i numeri della fermata per sicurezza assoluta
    fermata = request.args.get('fermata', '').strip()
    fermata = ''.join(filter(str.isdigit, fermata))
    
    # URL base senza forzare stringhe strane
    url = f"https://giromilano.atm.it/proxy.tpportal/api/tpPortal/geodata/pois/stops/{fermata}"
    
    headers = {
        "Referer": "https://giromilano.atm.it/", 
        "Origin": "https://giromilano.atm.it"
    }
    
    try:
        # Usiamo l'impersonazione di Chrome
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
