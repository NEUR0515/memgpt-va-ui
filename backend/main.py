import json
import logging
from os.path import join, dirname, exists
import requests
import secrets
from fastapi import (
    FastAPI,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    Body,
    Depends,
    status,
    Query,
    Request,
    Response,
    Cookie,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from memgpt import create_client
from utils import say
import uvicorn
from dotenv import load_dotenv
import io
from PyPDF2 import PdfReader
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
import pytz
from typing import Optional, Set
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from models import User
from database import Base, SessionLocal, engine
from pydantic import BaseModel, HttpUrl
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
import base64
import urllib.parse
from starlette.websockets import WebSocket
from starlette.types import Scope

# Function to extract cookies manually (if needed)
def get_cookie(scope: Scope, key: str):
    cookies = {}
    for header in scope.get("headers", []):
        if header[0].decode().lower() == "cookie":
            cookie_str = header[1].decode()
            for cookie in cookie_str.split("; "):
                if "=" in cookie:
                    k, v = cookie.split("=", 1)
                    cookies[k] = v
    return cookies.get(key)

# Load environment variables
dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Configure Logging
logging.basicConfig(
    level=logging.DEBUG,  # Change to INFO or WARNING in production
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Initialize the scheduler
scheduler = BackgroundScheduler()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with your frontend's URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
app.mount("/static", StaticFiles(directory="../frontend/build/static"), name="static")
app.mount("/img", StaticFiles(directory="../frontend/public/img"), name="img")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 Hours

# Spotify Configuration
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"

# Initialize MemGPT client and attach to agent
client = create_client()

def get_existing_agent(agent_name: str):
    agents = client.list_agents()
    for agent in agents:
        logger.debug(f"Agent {agent.id} is named {agent.name}")
        if agent.name == agent_name:
            return agent
    return None

def get_existing_source(data_source_name: str):
    data_sources = client.list_sources()
    for data_source in data_sources:
        logger.debug(f"Source {data_source.id} is named {data_source.name}")
        if data_source.name == data_source_name:
            return data_source
    return None

# Connect to the existing agent and source
agent_name = "Jarvis"  # Replace with your agent's name
data_source_name = "Jarvis-Data"  # Replace with your data source's name

agent_state = get_existing_agent(agent_name)
if not agent_state:
    logger.error(f"No agent with the name '{agent_name}' was found. Please create it manually.")
    exit(1)

source_state = get_existing_source(data_source_name)
if not source_state:
    logger.info(f"No source named '{data_source_name}' found. Creating it now.")
    client.create_source(name=data_source_name)
    source_state = get_existing_source(data_source_name)
    if not source_state:
        logger.error("Source was created but could not be found. Please try again.")
        exit(1)

client.attach_source_to_agent(source_state.id, agent_id=agent_state.id)
logger.info(f"Attached source '{data_source_name}' to agent '{agent_name}'.")

# Store active WebSocket connections
active_connections: Set[WebSocket] = set()

# Pydantic Models
class UserProfile(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None

class UserProfileResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None

class UserProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None
    password: Optional[str] = None

class SpotifyTokenResponse(BaseModel):
    spotify_token: str

# Utility Functions
def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserProfile):
    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        profile_picture=str(user.profile_picture) if user.profile_picture else None
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)  # Refresh to get the latest data from the DB
    logger.info(f"User '{user.username}' created successfully.")
    
    # Return the UserProfileResponse model
    return UserProfileResponse(
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        email=db_user.email,
        profile_picture=db_user.profile_picture
    )

def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        logger.warning(f"Authentication failed for username: {username} (user not found)")
        return False
    if not pwd_context.verify(password, user.hashed_password):
        logger.warning(f"Authentication failed for username: {username} (incorrect password)")
        return False
    return user

def get_token_from_cookie(app_access_token: str = Cookie(None)):
    if not app_access_token:
        logger.warning("App access token cookie not found.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return app_access_token

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})  # Convert to integer UNIX timestamp
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=30)  # 30 days expiration
    to_encode.update({"exp": int(expire.timestamp())})  # Convert to integer UNIX timestamp
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Refresh token created for user: {data.get('sub')}")
    return encoded_jwt

def get_current_user(db: Session, token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.error("Token payload missing 'sub'")
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
    except JWTError as e:
        logger.error(f"JWTError during token decoding: {e}")
        raise HTTPException(status_code=403, detail="Token is invalid or expired")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        logger.error(f"User not found for username: {username}")
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def get_valid_spotify_token(user: User, db: Session):
    if user.spotify_access_token and user.spotify_token_expires:
        try:
            spotify_token_expires = user.spotify_token_expires
            if spotify_token_expires.tzinfo is None:
                # Assume UTC if timezone is missing
                spotify_token_expires = spotify_token_expires.replace(tzinfo=timezone.utc)
                logger.debug("Assumed UTC timezone for spotify_token_expires.")
    
            logger.debug(f"Spotify token expires at: {spotify_token_expires}, tzinfo: {spotify_token_expires.tzinfo}")
    
            current_time = datetime.now(timezone.utc)
            logger.debug(f"Current UTC time: {current_time}")
    
            if spotify_token_expires > current_time:
                logger.info("Spotify token is still valid.")
                return user.spotify_access_token
            else:
                logger.info("Spotify token has expired. Attempting to refresh.")
                refresh_spotify_token(user, db)
                db.refresh(user)
    
                # Re-check after refresh
                if user.spotify_access_token and user.spotify_token_expires > datetime.now(timezone.utc):
                    logger.info("Spotify token is still valid after refresh.")
                    return user.spotify_access_token
    
            logger.error("Failed to refresh Spotify token. User may need to re-authenticate with Spotify.")
            return None
        except Exception as e:
            logger.error(f"Error handling Spotify tokens: {e}")
            return None
    else:
        logger.error("No Spotify tokens found for user. User may need to authenticate with Spotify.")
        return None

def refresh_spotify_token(user: User, db: Session):
    refresh_token = user.spotify_refresh_token
    if not refresh_token:
        logger.error("No refresh token available. Cannot refresh the Spotify token.")
        return
    
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post(TOKEN_URL, data=data, headers=headers)
    
    if response.status_code == 200:
        token_data = response.json()
        new_access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")  # Typically in seconds
        
        # Calculate the new expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Update user's Spotify tokens in the database
        user.spotify_access_token = new_access_token
        user.spotify_token_expires = expires_at  # Offset-naive UTC datetime
        db.commit()
        logger.info("Spotify token successfully refreshed.")
    else:
        logger.error(f"Failed to refresh Spotify token: {response.status_code}, {response.text}")


@app.get("/api/spotify-token", response_model=SpotifyTokenResponse)
def get_spotify_token(
    token: str = Depends(get_token_from_cookie),
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, token)
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    spotify_token = get_valid_spotify_token(current_user, db)
    if not spotify_token:
        raise HTTPException(status_code=400, detail="Spotify token not available. Please authenticate with Spotify.")
    
    return {"spotify_token": spotify_token}

# Authentication Routes
@app.post("/register", response_model=UserProfileResponse)
def register_user(user: UserProfile, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        logger.warning(f"Attempt to register with existing username: {user.username}")
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)

@app.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        logger.warning(f"Authentication failed for username: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Generate refresh token
    refresh_token_expires = timedelta(days=30)
    refresh_token = create_refresh_token(
        data={"sub": user.username}, expires_delta=refresh_token_expires
    )
    
    # Store refresh token and token expiration in the database
    user.app_refresh_token = refresh_token
    user.token_expires = datetime.now(timezone.utc) + access_token_expires
    db.commit()
    
    # Set cookies for access token and refresh token
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="app_access_token",
        value=access_token,
        httponly=True,
        samesite="Lax",
        expires=int((datetime.now(timezone.utc) + access_token_expires).timestamp()),
        secure=False  # Set to True in production
    )
    response.set_cookie(
        key="app_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="Lax",
        expires=int((datetime.now(timezone.utc) + refresh_token_expires).timestamp()),
        secure=False  # Set to True in production
    )
    return response

@app.post("/refresh-token")
def refresh_access_token(
    db: Session = Depends(get_db),
    refresh_token: str = Cookie(None)  # Assuming app's refresh token is stored in a separate cookie
):
    if not refresh_token:
        logger.warning("App refresh token cookie not found.")
        raise HTTPException(status_code=401, detail="Refresh token missing.")
    
    # Decode and validate the app's refresh token
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.error("Refresh token payload missing 'sub'")
            raise HTTPException(status_code=403, detail="Invalid refresh token")
    except JWTError as e:
        logger.error(f"JWTError during token decoding: {e}")
        raise HTTPException(status_code=403, detail="Invalid refresh token")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        logger.error(f"User not found for username: {username}")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the refresh token matches
    if user.app_refresh_token != refresh_token:
        logger.warning(f"App refresh token mismatch for user: {username}")
        raise HTTPException(status_code=403, detail="Invalid refresh token")
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Create a new refresh token (token rotation)
    new_refresh_token = create_refresh_token(
        data={"sub": user.username}, expires_delta=timedelta(days=30)
    )
    
    # Update refresh token and token expiration in the database
    user.app_access_token = access_token
    user.app_refresh_token = new_refresh_token
    user.token_expires = datetime.now(timezone.utc) + access_token_expires
    db.commit()
    logger.info(f"App access token refreshed for user: {username}")
    
    expire_access = datetime.now(timezone.utc) + access_token_expires
    expire_refresh = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Set new cookies
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="app_access_token",
        value=access_token,
        httponly=True,
        samesite="Lax",
        expires=int(expire_access.timestamp()),
        secure=False  # Set to True in production
    )
    response.set_cookie(
        key="app_refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="Lax",
        expires=int(expire_refresh.timestamp()),
        secure=False  # Set to True in production
    )
    return response

# Token Verification Endpoint
@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.error("Token payload missing 'sub'")
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        logger.info(f"Token is valid for user: {username}")
        return {"message": "Token is valid"}
    except JWTError as e:
        logger.error(f"JWTError during token verification: {e}")
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

# User Profile Endpoints
@app.get("/api/user-profile", response_model=UserProfileResponse)
def get_user_profile(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "profile_picture": user.profile_picture,
    }

@app.put("/api/user-profile", response_model=UserProfileResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    token: str = Depends(get_token_from_cookie),
    db: Session = Depends(get_db)
):
    user = get_current_user(db, token)

    # Update user fields
    user.first_name = profile_data.first_name
    user.last_name = profile_data.last_name
    user.email = profile_data.email

    # Update profile picture if provided
    user.profile_picture = str(profile_data.profile_picture) if profile_data.profile_picture else None

    # Update password if provided
    if profile_data.password:
        hashed_password = pwd_context.hash(profile_data.password)
        user.hashed_password = hashed_password

    db.commit()
    logger.info(f"User '{user.username}' profile updated successfully.")

    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "profile_picture": user.profile_picture
    }

# Spotify Authentication Routes
@app.get("/auth/login")
async def spotify_login(request: Request):
    scopes = "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state"
    
    # Generate a unique state parameter for CSRF protection
    state = secrets.token_urlsafe(16)
    
    # Determine if the app is running in production
    is_production = os.getenv("ENV") == "production"
    
    # Store the state in a secure, HttpOnly cookie
    response = RedirectResponse(url="")
    response.set_cookie(
        key="spotify_auth_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=is_production,  # True in production, False otherwise
        max_age=300  # State is valid for 5 minutes
    )
    
    # Build the dynamic redirect_uri using the full request URL
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    redirect_uri = f"{base_url}/auth/callback"
    
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "scope": scopes,
        "redirect_uri": redirect_uri,
        "state": state,
        "show_dialog": "true"  # Optional: Forces the user to re-login and re-authorize
    }
    
    auth_url = f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"
    logger.info("Redirecting user to Spotify authentication.")
    response.headers["Location"] = auth_url
    response.status_code = 307  # Temporary Redirect
    return response

@app.get("/auth/callback")
async def spotify_callback(
    request: Request, 
    code: str = Query(...), 
    state: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    # Retrieve the state from the cookie
    stored_state = request.cookies.get("spotify_auth_state")
    if not stored_state or state != stored_state:
        logger.error("State mismatch or missing.")
        raise HTTPException(status_code=400, detail="State mismatch or missing.")
    
    # Determine if the app is running in production
    is_production = os.getenv("ENV") == "production"
    
    # Set redirect_uri to match /auth/login
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    redirect_uri = f"{base_url}/auth/callback"
    
    # Exchange authorization code for tokens
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    response = requests.post(TOKEN_URL, data=payload, headers=headers)
    
    if response.status_code != 200:
        logger.error(f"Failed to obtain tokens from Spotify: {response.status_code}, {response.text}")
        raise HTTPException(status_code=400, detail="Failed to obtain access token from Spotify.")
    
    token_data = response.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")  # in seconds
    
    # Calculate token expiration time
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    # Retrieve the user associated with the app's access token from the app's cookie
    app_access_token = request.cookies.get("app_access_token")
    if not app_access_token:
        logger.error("App access token cookie missing during Spotify callback.")
        raise HTTPException(status_code=401, detail="Unauthorized: App access token missing.")
    
    # Retrieve the user from the app's access token
    user = get_current_user(db, app_access_token)
    if not user:
        logger.error("User not found during Spotify callback.")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user's Spotify tokens in the database
    user.spotify_access_token = access_token
    if refresh_token:
        user.spotify_refresh_token = refresh_token
    user.spotify_token_expires = expires_at  # Assign datetime object directly
    db.commit()
    logger.info(f"Spotify tokens updated for user: {user.username}")
    
    # Clear the state cookie as it's no longer needed
    response_redirect = RedirectResponse(url=os.getenv("FRONTEND_URL", "/"))
    response_redirect.delete_cookie(key="spotify_auth_state")
    
    # Set the spotify_refresh_token in a separate cookie
    if refresh_token:
        response_redirect.set_cookie(
            key="spotify_refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=is_production,  # True in production, False otherwise
            expires=int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
        )
    
    return response_redirect

@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="app_access_token")
    response.delete_cookie(key="app_refresh_token")
    response.delete_cookie(key="spotify_refresh_token")
    logger.info("User logged out successfully.")
    return {"message": "Logged out successfully"}

# WebSocket Endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    app_access_token = get_cookie(websocket.scope, "app_access_token")
    if not app_access_token:
        logger.warning("WebSocket connection attempted without token.")
        await websocket.close(code=1008)  # Policy Violation
        return
    try:
        user = get_current_user(db, app_access_token)
        username = user.username
        logger.info(f"WebSocket connection accepted for user: {username}")
    except HTTPException as e:
        logger.warning(f"WebSocket connection closed due to invalid token: {e.detail}")
        await websocket.close(code=1008)
        return

    active_connections.add(websocket)
    logger.info(f"WebSocket connection established for user: {username}")

    try:
        while True:
            try:
                # Receive the incoming message
                data = await websocket.receive_text()
                message = json.loads(data)
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected by {username}.")
                break
            except Exception as e:
                logger.error(f"Error receiving message from {username}: {e}")
                await websocket.send_json({"error": "Invalid message format."})
                continue

            try:
                command = message.get('message', '')
                logger.debug(f"Processing command from {username}: {command}")

                if command:
                    if "exit" in command.lower() or "stop" in command.lower():
                        await websocket.close()
                        logger.info(f"WebSocket closed on 'exit' or 'stop' command by {username}.")
                        break
                    else:
                        response = client.user_message(agent_id=agent_state.id, message=command)

                        thought_message = response.messages[0].get("internal_monologue")
                        if thought_message:
                            await websocket.send_json({
                                "type": "thought",
                                "message": thought_message
                            })
                            logger.debug(f"Sent thought message to {username}: {thought_message}")

                        assistant_message = None
                        if response.messages:
                            for r in response.messages:
                                if "assistant_message" in r:
                                    assistant_message = r.get("assistant_message")

                        if assistant_message:
                            await broadcast_message(assistant_message)
                            say(assistant_message)
                            logger.debug(f"Broadcasted assistant message: {assistant_message}")

            except Exception as e:
                logger.error(f"Error processing message from {username}: {e}")
                await websocket.send_text(f"Error: {str(e)}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected gracefully by {username}.")
    finally:
        active_connections.remove(websocket)
        await broadcast_log(f"WebSocket connection closed for {username}.")

# Function to broadcast log messages to all active WebSocket connections
async def broadcast_log(log: str):
    for connection in active_connections:
        try:
            await connection.send_json({"LOG": log})
        except Exception as e:
            logger.error(f"Error broadcasting log to WebSocket: {e}")

# Function to broadcast messages to all active WebSocket connections
async def broadcast_message(message: str):
    for connection in active_connections:
        try:
            await connection.send_json({"message": message})
            logger.debug(f"Broadcasted message to WebSocket: {message}")
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")

# File Upload Endpoint
@app.post("/upload")
async def upload_file(file: UploadFile):
    try:
        content = await file.read()
        filename = file.filename
        logger.info(f"Received file: {filename}")

        # Try to decode as UTF-8, fall back to handling as binary if it fails
        try:
            content_str = content.decode("utf-8")  # Decode the bytes to a string
            logger.info(f"File {filename} decoded as UTF-8")

            # Check if the file is a code file and process it
            if filename.endswith(('.py', '.js', '.java', '.html', '.css', '.cpp', '.ts')):
                logger.info(f"Processing code file: {filename}")
                client.insert_archival_memory(agent_state.id, content_str)
            else:
                logger.info(f"File {filename} is not a code file, handling as text.")
                client.insert_archival_memory(agent_state.id, content_str)

        except UnicodeDecodeError:
            logger.warning(f"File {filename} could not be decoded as UTF-8, handling as binary.")

            # Handle binary files (PDFs)
            if filename.endswith(".pdf"):
                try:
                    pdf_file = io.BytesIO(content)  # Convert bytes to a file-like object
                    reader = PdfReader(pdf_file)
                    extracted_text = ""
                    
                    # Extract text from all the pages
                    for page in reader.pages:
                        extracted_text += page.extract_text()

                    # Insert extracted text into memory
                    client.insert_archival_memory(agent_state.id, extracted_text)
                    logger.info(f"Extracted text from {filename} and added to archival memory.")
                except Exception as e:
                    logger.error(f"Error processing PDF {filename}: {e}")
                    return {"message": f"Error processing PDF {filename}: {e}"}
            else:
                logger.warning(f"Binary file {filename} is not a supported type.")
                return {"message": f"Binary file {filename} is not a supported type."}

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}")
        return {"message": f"Error processing file {file.filename}: {e}"}

    return {"message": f"Successfully processed {filename}"}

# Function to fetch Google Calendar events
def fetch_google_calendar_events():
    TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'gcal_token.json')
    CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'google_api_credentials.json')
    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    
    # Load credentials
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('calendar', 'v3', credentials=creds)

    # Define the Europe/London time zone
    london_tz = pytz.timezone('Europe/London')

    # Get the current time in the Europe/London time zone
    now = datetime.now(london_tz)

    # Format the current time as an RFC3339 string
    now_rfc3339 = now.isoformat()

    # Call the Calendar API to fetch events in Europe/London time zone
    try:
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now_rfc3339,  # Ensure this is in RFC3339 format
            timeZone='Europe/London',  # Specify the time zone for the query
            maxResults=5,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        logger.info(f"Fetched {len(events)} calendar events.")
        return events

    except HttpError as error:
        logger.error(f"An error occurred while fetching calendar events: {error}")
        return []

# Calendar Events Endpoint
@app.get("/api/calendar-events")
def get_calendar_events(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    events = fetch_google_calendar_events()
    return events

# Initialize the tasks.json file
def initialize_tasks_file():
    # Check if tasks.json exists and is not empty
    if not exists('tasks.json'):
        # If the file doesn't exist, create it with an empty list
        with open('tasks.json', 'w') as f:
            json.dump([], f)  # Initialize with an empty list
            logger.info("Initialized tasks.json with an empty list.")

# Load tasks from tasks.json or initialize an empty list if file doesn't exist
if os.path.exists('tasks.json'):
    with open('tasks.json', 'r') as f:
        try:
            tasks = json.load(f)
            logger.info(f"Loaded {len(tasks)} tasks from tasks.json.")
        except json.JSONDecodeError:
            tasks = []
            logger.warning("tasks.json is corrupted. Initialized with an empty list.")
else:
    initialize_tasks_file()
    tasks = []

# Tasks Endpoints
@app.get("/api/tasks")
def get_tasks(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    
    if not exists('./tasks.json'):
        logger.info("tasks.json does not exist. Returning empty task list.")
        return {"tasks": []}  # Return empty list if file doesn't exist

    with open('./tasks.json', 'r') as f:
        try:
            tasks = json.load(f)
            logger.info(f"Tasks loaded from JSON: {tasks}")
        except json.JSONDecodeError:
            tasks = []
            logger.warning("tasks.json is corrupted. Returning empty task list.")
    
    return {"tasks": tasks}

@app.post("/api/tasks/add")
async def add_task(task: dict = Body(...), token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    task_description = task.get("task")
    
    if not task_description:
        logger.warning(f"Empty task received from user: {user.username}")
        raise HTTPException(status_code=400, detail="Task description is required.")
    
    # Push task to agent memory and save it
    agent_state.memory.task_queue_push(task_description)
    logger.info(f"Task added by {user.username}: {task_description}")
    
    return {"tasks": agent_state.memory.memory["tasks"].value}

# Text-to-Speech Playback Endpoint
@app.get("/api/play-tts", response_class=FileResponse)
def play_tts(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    
    # Define the path to the latest generated TTS MP3 file
    file_path = "output.mp3"  # Replace with your actual path if necessary

    if os.path.exists(file_path):
        logger.info(f"Playing TTS file: {file_path}")
        return FileResponse(file_path, media_type="audio/mpeg", filename="output.mp3")
    else:
        logger.warning(f"TTS file not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")

# Spotify Helper Functions
def set_spotify_volume(spotify_token: str, device_id: str, volume_percent: int):
    headers = {
        "Authorization": f"Bearer {spotify_token}",
        "Content-Type": "application/json"
    }

    # Spotify API endpoint to set volume
    volume_url = "https://api.spotify.com/v1/me/player/volume"
    params = {
        "volume_percent": volume_percent,  # Volume level from 0 to 100
        "device_id": device_id  # Specify the device ID
    }

    volume_response = requests.put(volume_url, headers=headers, params=params)

    if volume_response.status_code == 204:
        logger.info(f"Volume set to {volume_percent}% on device {device_id}.")
    else:
        logger.error(f"Error setting volume: {volume_response.status_code}, {volume_response.text}")

def play_spotify_alarm(spotify_token: str, playlist_uri: str, track_uri: Optional[str] = None, volume_percent: int = 100):
    headers = {
        "Authorization": f"Bearer {spotify_token}",
        "Content-Type": "application/json"
    }

    # Get available devices
    devices_response = requests.get("https://api.spotify.com/v1/me/player/devices", headers=headers)

    if devices_response.status_code == 200:
        devices = devices_response.json()["devices"]
        if not devices:
            logger.warning("No active Spotify devices found.")
            return
        else:
            # Check for a device named "Jarvis"
            jarvis_device = next((device for device in devices if device['name'] == 'Jarvis'), None)
            if jarvis_device:
                device_id = jarvis_device['id']
                logger.info(f"Using device: {jarvis_device['name']}")
            else:
                logger.info("Device named 'Jarvis' not found. Using the first available device.")
                device_id = devices[0]['id']  # Default to the first device if "Jarvis" is not found
    else:
        logger.error(f"Error fetching Spotify devices: {devices_response.status_code}, {devices_response.text}")
        return

    # Set the volume before starting playback
    set_spotify_volume(spotify_token, device_id, volume_percent)

    # Prepare the data for playback
    play_data = {
        "context_uri": playlist_uri  # Ensure the context is the playlist so it continues playing the rest
    }

    # Optionally add an offset to start from a specific track in the playlist
    if track_uri:
        play_data["offset"] = {"uri": track_uri}  # Start from this track, but continue with the playlist

    # Now, start playback on the specified device
    play_url = "https://api.spotify.com/v1/me/player/play"
    play_response = requests.put(play_url, headers=headers, json=play_data, params={"device_id": device_id})

    if play_response.status_code == 204:
        device_name = jarvis_device['name'] if jarvis_device else devices[0]['name']
        logger.info(f"Started playing on device {device_name}.")
    else:
        logger.error(f"Error starting playback: {play_response.status_code}, {play_response.text}")

# Wakeup Message Functions
async def send_wakeup_message():
    current_time = datetime.now().strftime("%H:%M:%S")
    message = f"Good morning! The time is {current_time}. Let's start the day!"
    await broadcast_message(message=message)  # Send the message over WebSocket
    say(message)  # Use the TTS function to speak the message
    logger.info("Woke up user with message.")

def send_wakeup_message_wrapper():
    asyncio.run(send_wakeup_message())  # Run the async function in a synchronous context

# Schedule the wakeup message at 7:00 AM
scheduler.start()
scheduler.add_job(send_wakeup_message_wrapper, 'cron', hour=7, minute=0)
logger.info("Scheduler started and wakeup message scheduled at 7:00 AM daily.")

# WebSocket Broadcast Function
async def broadcast_message(message: str):
    for connection in active_connections:
        try:
            await connection.send_json({"message": message})
            logger.debug(f"Broadcasted message to WebSocket: {message}")
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")

@app.get("/frontend")
def serve_frontend():
    index_file_path = "../frontend/build/index.html"
    if os.path.exists(index_file_path):
        return FileResponse(index_file_path)
    else:
        return {"error": "index.html not found"}

@app.get("/")
def serve_frontend_root():
    index_file_path = "../frontend/build/index.html"
    if os.path.exists(index_file_path):
        return FileResponse(index_file_path)
    else:
        return {"error": "index.html not found"}

# Run the application
if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
