import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from models import Base

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///resumatch.db')

# For SQLite, specify connect_args to allow multithreading
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True, 
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
