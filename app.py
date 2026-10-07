from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    linea = request.args.get('linea')
    fermata = request.args.get('fermata')
    
    # Usiamo l'endpoint esatto delle fermate usato dal codice del tuo compagno
    url = f"https://giromilano.atm.it/proxy.tpportal/api/tpPortal/geodata/pois/stops/{fermata}"
    
    headers = {
        "Referer": "https://giromilano.atm.it/", 
        "Origin": "https://giromilano.atm.it"
    }
    
    try:
        # Usiamo l'impersonazione di Chrome come suggerito dal compagno
        response = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
