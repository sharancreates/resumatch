from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_premium = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    analyses = db.relationship('ResumeAnalysis', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_premium": self.is_premium,
            "created_at": self.created_at.isoformat()
        }

class ResumeAnalysis(db.Model):
    __tablename__ = 'resume_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    resume_text = db.Column(db.Text, nullable=False)
    job_description = db.Column(db.Text, nullable=False)
    score = db.Column(db.Float, nullable=False)
    lexical_score = db.Column(db.Float, nullable=False)
    semantic_score = db.Column(db.Float, nullable=False)
    missing_keywords = db.Column(db.Text, nullable=False)  # JSON-serialized string
    resume_structure = db.Column(db.Text, nullable=True)  # JSON-serialized string of parsed structure
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        try:
            missing = json.loads(self.missing_keywords)
        except Exception:
            missing = []
            
        structure = None
        if self.resume_structure:
            try:
                structure = json.loads(self.resume_structure)
            except Exception:
                structure = None

        if not structure:
            try:
                from utils.resume_parser import parse_resume_structure
                structure = parse_resume_structure(self.resume_text)
            except Exception:
                structure = {"contact_details": {}, "sections": {}}
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resume_text": self.resume_text,
            "job_description": self.job_description,
            "score": self.score,
            "breakdown": {
                "lexical": self.lexical_score,
                "semantic": self.semantic_score
            },
            "missing": missing,
            "structure": structure,
            "created_at": self.created_at.isoformat()
        }
