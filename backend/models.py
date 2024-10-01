# models.py

from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String(150), nullable=False)
    last_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    profile_picture = Column(String, nullable=True)  # URL or file path
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False, onupdate=datetime.now(timezone.utc))
    
    app_access_token = Column(String, nullable=True)
    app_refresh_token = Column(String, nullable=True)
    token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Fields for Spotify Integration
    spotify_access_token = Column(String, nullable=True)
    spotify_refresh_token = Column(String, nullable=True)
    spotify_token_expires = Column(DateTime(timezone=True), nullable=True)
