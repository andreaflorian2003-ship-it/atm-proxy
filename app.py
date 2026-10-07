from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    linea = request.args.get('linea')
    fermata = request.args.get('fermata')
    
    url = f"https://giromilano.atm.it/proxy.tpportal/api/tpMob/StopMonitoring?codiceLinea={linea}&codiceEnte=ATM&codiceFermata={fermata}"
    
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://giromilano.atm.it",
        "Referer": "https://giromilano.atm.it/"
    }
    
    try:
        # Qui usiamo la magia suggerita dal tuo amico: impersoniamo Chrome!
        response = requests.get(url, headers=headers, impersonate="chrome120")
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
