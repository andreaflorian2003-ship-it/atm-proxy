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
        # Proviamo a restituire direttamente il JSON, ma se fallisce vediamo il testo
        return jsonify(response.json())
    except Exception as e:
        return jsonify({
            "error": str(e), 
            "status_code": getattr(response, 'status_code', None),
            "text_restituito": getattr(response, 'text', 'Nessuna risposta')
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
