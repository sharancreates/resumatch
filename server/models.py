import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=True) # Nullable for OAuth logins
    name = Column(String(100), nullable=True)
    linkedin_url = Column(String(256), nullable=True)
    industry = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    resume_preference = Column(JSON, nullable=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(100), nullable=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    memberships = relationship('Membership', back_populates='user', cascade='all, delete-orphan')
    resumes = relationship('Resume', back_populates='user', cascade='all, delete-orphan')
    api_keys = relationship('ApiKey', back_populates='user', cascade='all, delete-orphan')
    usage_logs = relationship('UsageLog', back_populates='user', cascade='all, delete-orphan')

    @property
    def is_premium(self):
        # Premium if they have memberships in an org with a PRO/TEAM plan
        # For simplicity, we can also check if they have a direct premium flag
        # Or look up their active organization subscriptions.
        # Let's check direct flag or active memberships.
        for membership in self.memberships:
            if membership.organization.subscription and membership.organization.subscription.plan in ['PRO', 'TEAM']:
                return True
        return False

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "linkedin_url": self.linkedin_url,
            "industry": self.industry,
            "job_title": self.job_title,
            "is_premium": self.is_premium,
            "email_verified": self.email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Organization(Base):
    __tablename__ = 'organizations'

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    memberships = relationship('Membership', back_populates='organization', cascade='all, delete-orphan')
    workspaces = relationship('Workspace', back_populates='organization', cascade='all, delete-orphan')
    subscription = relationship('Subscription', back_populates='organization', uselist=False, cascade='all, delete-orphan')
    resumes = relationship('Resume', back_populates='organization')
    job_descriptions = relationship('JobDescription', back_populates='organization')
    audit_logs = relationship('AuditLog', back_populates='organization', cascade='all, delete-orphan')

class Membership(Base):
    __tablename__ = 'memberships'

    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(20), default='VIEWER') # OWNER, ADMIN, RECRUITER, VIEWER
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship('Organization', back_populates='memberships')
    user = relationship('User', back_populates='memberships')

class Workspace(Base):
    __tablename__ = 'workspaces'

    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship('Organization', back_populates='workspaces')
    resumes = relationship('Resume', back_populates='workspace')
    job_descriptions = relationship('JobDescription', back_populates='workspace')

class Resume(Base):
    __tablename__ = 'resumes'

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)
    workspace_id = Column(String(36), ForeignKey('workspaces.id', ondelete='SET NULL'), nullable=True)
    title = Column(String(100), nullable=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship('User', back_populates='resumes')
    organization = relationship('Organization', back_populates='resumes')
    workspace = relationship('Workspace', back_populates='resumes')
    versions = relationship('ResumeVersion', back_populates='resume', cascade='all, delete-orphan')
    analyses = relationship('Analysis', back_populates='resume', cascade='all, delete-orphan')

class ResumeVersion(Base):
    __tablename__ = 'resume_versions'

    id = Column(String(36), primary_key=True)
    resume_id = Column(String(36), ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    version = Column(Integer, nullable=False)
    file_url = Column(String(256), nullable=False)
    resume_text = Column(Text, nullable=False)
    parsed_json = Column(JSON, nullable=False) # Structured data (experience, skills, education)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    resume = relationship('Resume', back_populates='versions')
    analyses = relationship('Analysis', back_populates='resume_version', cascade='all, delete-orphan')

class JobDescription(Base):
    __tablename__ = 'job_descriptions'

    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    workspace_id = Column(String(36), ForeignKey('workspaces.id', ondelete='SET NULL'), nullable=True)
    title = Column(String(100), nullable=False)
    company_name = Column(String(100), nullable=True)
    job_text = Column(Text, nullable=False)
    tags = Column(JSON, nullable=True) # JSON Array of strings
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship('Organization', back_populates='job_descriptions')
    workspace = relationship('Workspace', back_populates='job_descriptions')
    analyses = relationship('Analysis', back_populates='job_description', cascade='all, delete-orphan')

class Analysis(Base):
    __tablename__ = 'analyses'

    id = Column(String(36), primary_key=True)
    resume_id = Column(String(36), ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    resume_version_id = Column(String(36), ForeignKey('resume_versions.id', ondelete='CASCADE'), nullable=False)
    job_description_id = Column(String(36), ForeignKey('job_descriptions.id', ondelete='CASCADE'), nullable=False)
    score = Column(Float, nullable=False)
    lexical_score = Column(Float, nullable=False)
    semantic_score = Column(Float, nullable=False)
    missing_keywords = Column(JSON, nullable=False) # JSON Array
    skills_gap = Column(JSON, nullable=False)       # JSON Object
    recommendations = Column(JSON, nullable=False)  # JSON Array
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    resume = relationship('Resume', back_populates='analyses')
    resume_version = relationship('ResumeVersion', back_populates='analyses')
    job_description = relationship('JobDescription', back_populates='analyses')

    def to_dict(self):
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "resume_version_id": self.resume_version_id,
            "job_description_id": self.job_description_id,
            "score": self.score,
            "breakdown": {
                "lexical": self.lexical_score,
                "semantic": self.semantic_score
            },
            "missing": self.missing_keywords,
            "skills_gap": self.skills_gap,
            "recommendations": self.recommendations,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Subscription(Base):
    __tablename__ = 'subscriptions'

    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), unique=True, nullable=False)
    stripe_subscription_id = Column(String(100), unique=True, nullable=True)
    plan = Column(String(20), default='FREE') # FREE, PRO, TEAM
    status = Column(String(50), nullable=False) # active, past_due, canceled, trialing
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship('Organization', back_populates='subscription')

class ApiKey(Base):
    __tablename__ = 'api_keys'

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    key_prefix = Column(String(12), nullable=False)
    key_hash = Column(String(128), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    rate_limit = Column(Integer, default=100)
    scopes = Column(JSON, nullable=True) # JSON Array of scopes
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship('User', back_populates='api_keys')

class UsageLog(Base):
    __tablename__ = 'usage_logs'

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    endpoint = Column(String(100), nullable=False)
    scans_used = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship('User', back_populates='usage_logs')

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    actor_id = Column(String(36), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=False)
    target_id = Column(String(36), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship('Organization', back_populates='audit_logs')
