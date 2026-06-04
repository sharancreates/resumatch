import os
from dotenv import load_dotenv

# Load environment configuration variables
load_dotenv()

from flask import Flask
from flask_cors import CORS
from routes.analyze import analyze_bp
from routes.auth import auth_bp
from routes.billing import billing_bp
from models import db
from utils.limiter import limiter

app = Flask(__name__)

# Security and database configurations
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///resumatch.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Load secret key; issue a caution in production if the default is in use
default_secret = 'dev-secret-key-resumatch-9821'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', default_secret)

# Read debug environment
debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ['true', '1', 't']

if not debug_mode and app.config['SECRET_KEY'] == default_secret:
    print("WARNING: Using default SECRET_KEY in production mode! Please set SECRET_KEY environment variable.")

# Initialize DB and Limiter
db.init_app(app)
limiter.init_app(app)

# CORS: use ALLOWED_ORIGINS env var in production, default to Vite dev server
allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, origins=allowed_origins)

app.register_blueprint(analyze_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(billing_bp, url_prefix='/api/billing')

# Auto-create tables on startup and apply schema patches
with app.app_context():
    db.create_all()
    
    # 1. Apply is_premium patch to users table if not exists
    try:
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0"))
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    # 2. Apply resume_structure patch to resume_analyses table if not exists
    try:
        db.session.execute(db.text("ALTER TABLE resume_analyses ADD COLUMN resume_structure TEXT"))
        db.session.commit()
    except Exception:
        db.session.rollback()

if __name__ == '__main__':  
    print(f"ResuMatch Server Starting (debug={debug_mode})...")
    app.run(debug=debug_mode, port=5000)