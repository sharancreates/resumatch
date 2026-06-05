import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.auth import auth_router
from routes.billing import billing_router
from routes.analyze import analyze_router
from routes.teams import teams_router
from utils.db import init_db

app = FastAPI(
    title="ResuMatch SaaS API",
    description="A multi-tenant resume parser, ATS hybrid scanner, and AI rewriter API.",
    version="1.0.0"
)

# CORS Configuration
allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(analyze_router)
app.include_router(teams_router)

# Initialize Database tables
@app.on_event("startup")
def startup_event():
    print("ResuMatch Core API Booting...")
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ['true', '1', 't']
    print(f"Running ResuMatch API (debug={debug_mode})...")
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=debug_mode)