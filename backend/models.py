from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base, engine

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    profile_picture = Column(String, nullable=True)  # This can be optional
    spotify_token = relationship("SpotifyToken", back_populates="user", uselist=False)
    
class SpotifyToken(Base):
    __tablename__ = "spotify_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    user = relationship("User", back_populates="spotify_token")

# Create the database tables if they don't exist
Base.metadata.create_all(bind=engine)

