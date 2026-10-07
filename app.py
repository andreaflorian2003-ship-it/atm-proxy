from flask import Flask, request, jsonify
from curl_cffi import requests

app = Flask(__name__)

@app.route('/atm')
def get_atm():
    linea = request.args.get('linea')
    fermata = request.args.get('fermata')
    
    url = f"https://giromilano.atm.it/proxy.tpportal/api/tpPortal/geodata/pois/stops/{fermata}"
    
    headers = {
        "Referer": "https://giromilano.atm.it/", 
        "Origin": "https://giromilano.atm.it"
    }
    
    try:
        response = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
        # Stampiamo nei log di Render cosa arriva esattamente
        print(f"Status Code: {response.status_code}")
        print(f"Testo ricevuto: {response.text[:200]}")
        
        return response.text, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
