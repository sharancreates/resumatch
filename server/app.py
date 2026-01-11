from flask import Flask
from flask_cors import CORS
from routes.analyze import analyze_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(analyze_bp, url_prefix='/api')

if __name__ == '__main__':
    print("ResuMatch Server Starting...")
    app.run(debug=True, port=5000)