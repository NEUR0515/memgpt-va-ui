import json
import logging
from os.path import join, dirname, exists
import ast
import re
import requests
from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect, HTTPException, Body, Depends, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from memgpt import create_client, memory
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
from typing import Optional
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from models import User
from database import SessionLocal, engine
from pydantic import BaseModel, HttpUrl
from fastapi.middleware.cors import CORSMiddleware
from logout_router import router as auth_router
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
import base64
import urllib.parse

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# FastAPI app
app = FastAPI()

# Initialize the scheduler
scheduler = BackgroundScheduler()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Add the CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can specify the allowed origins, "*" allows all
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Mount the correct static directory to serve the JS and CSS files
app.mount("/static", StaticFiles(directory="../frontend/build/static"), name="static")
#app.mount("/frontend", StaticFiles(directory="../frontend/build", html=True), name="frontend")
app.mount("/img", StaticFiles(directory="../frontend/public/img"), name="img")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Your JWT secret and algorithm
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720 # (12 Hours)

CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
REDIRECT_URI = "http://localhost:8000/auth/callback"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SCOPES = "user-read-private user-read-email streaming"

# Initialize the client and create tools
client = create_client()
# Function to get an existing agent
def get_existing_agent(agent_name):
    agents = client.list_agents()
    for agent in agents:
        print(f"Agent {agent.id} is named {agent.name}")
        if agent.name == agent_name:
            return agent
    return None

# Function to get an existing source
def get_existing_source(data_source_name):
    data_sources = client.list_sources()
    for data_source in data_sources:
        print(f"Source {data_source.id} is named {data_source.name}")
        if data_source.name == data_source_name:
            return data_source
    return None

# Connect to an existing agent by name (or manually specify its ID)
agent_name = "Jarvis"  # Set this to the name of your manually created agent
agent_state = get_existing_agent(agent_name)
data_source_name = "Jarvis-Data"   # Set this to the name of your manually created source
source_state = get_existing_source(data_source_name)

if not agent_state:
    print(f"No agent with the name '{agent_name}' was found. Please create it manually.")
    exit(1)

if not source_state:
    print(f"No source with the name '{data_source_name}' was found. It will now be created.")
    client.create_source(name=data_source_name)
    source_state = get_existing_source(data_source_name)
    if not source_state:
        print("The source was created but could not be found. Please try again.")
        exit(1)
    
    
client.attach_source_to_agent(source_state.id, agent_id=agent_state.id)
# Store active WebSocket connections
active_connections = set()

class UserProfile(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None  # Now this field is optional

# Model for returning user profile data (output model)
class UserProfileResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None  # Now this field is optional
    
class UserProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    email: str
    profile_picture: Optional[HttpUrl] = None  # Make profile picture optional
    password: Optional[str] = None  # Password is optional for updating

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
        profile_picture=str(user.profile_picture) if user.profile_picture else None  # Convert to string if not None
    )
    db.add(db_user)
    db.commit()
    return f"User {user.username} created successfully."

@app.post("/register")
def register_user(user: UserProfile, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)

# Authenticate the user
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not pwd_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    london_tz = pytz.timezone('Europe/London')
    now = datetime.now(london_tz)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)  # Use the updated expiration time
    to_encode.update({"exp": expire.timestamp()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        return {"message": "Token is valid"}
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

# Ensure that the token is validated (use your own verify_token function or equivalent)
def get_current_user(db: Session, token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

# Route to get user profile
@app.get("/api/user-profile", response_model=UserProfileResponse)
def get_user_profile(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user(db, token)
    return {
        "username": user.username,  # Ensure this is included
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "profile_picture": user.profile_picture,
        # Do not return password for security reasons
    }
@app.put("/api/user-profile", response_model=UserProfileResponse)
def update_user_profile(profile_data: UserProfileUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    #logging.info(f"Received profile data: {profile_data}")
    user = get_current_user(db, token)

    # Update user fields
    user.first_name = profile_data.first_name
    user.last_name = profile_data.last_name
    user.email = profile_data.email

    # Convert HttpUrl to string before saving to the database
    user.profile_picture = str(profile_data.profile_picture) if profile_data.profile_picture else None

    # Update password if provided
    if profile_data.password:  
        hashed_password = pwd_context.hash(profile_data.password)
        user.hashed_password = hashed_password

    db.commit()

    # Return the updated user profile (without the password)
    return {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "profile_picture": user.profile_picture
    }

@app.get("/api/user-info")
async def get_user_info(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

@app.get("/frontend")
def serve_frontend():
    index_file_path = "../frontend/build/index.html"
    if os.path.exists(index_file_path):
        #print(f"Serving frontend from {index_file_path}")
        return FileResponse(index_file_path)
    else:
        #print(f"index.html not found at {index_file_path}")
        return {"error": "index.html not found"}

@app.get("/")
def serve_frontend():
    index_file_path = "../frontend/build/index.html"
    if os.path.exists(index_file_path):
        #print(f"Serving frontend from {index_file_path}")
        return FileResponse(index_file_path)
    else:
        #print(f"index.html not found at {index_file_path}")
        return {"error": "index.html not found"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    # Token validation before accepting WebSocket connection
    if not token:
        await websocket.close(code=1008)  # Close connection with specific code
        await websocket.send_json({"detail": "Token is missing"})
        return

    try:
        # Verify token using the verify_token function
        token_payload = verify_token(token)
        username = token_payload.get("username")
        if not username:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        print(f"Token verified for user: {username}")

    except HTTPException as e:
        await websocket.close(code=1008)  # Close WebSocket if token is invalid
        await websocket.send_json({"detail": "Token is invalid or expired"})
        return

    await websocket.accept()  # Accept WebSocket connection
    active_connections.add(websocket)
    print(f"WebSocket connection accepted for user: {username}")

    try:
        while True:
            try:
                # Receive the incoming message
                data = await websocket.receive_text()
                message = json.loads(data)

                #print(f"Received message: {message.get('message')}")

            except WebSocketDisconnect:
                print(f"WebSocket disconnected by {username}.")
                break

            try:
                command = message.get('message', '')
                #print(f"Processing command: {command}")

                if command:
                    if "exit" in command or "stop" in command:
                        await websocket.close()
                        print(f"WebSocket closed on 'exit' or 'stop' command by {username}.")
                        break
                    else:
                        response = client.user_message(agent_id=agent_state.id, message=command)

                        thought_message = response.messages[0].get("internal_monologue")
                        if thought_message:
                            await websocket.send_json({
                                "type": "thought",
                                "message": thought_message
                            })
                            #print(f"Sent thought message: {thought_message}")

                        assistant_message = None
                        if response.messages:
                            for r in response.messages:
                                if "assistant_message" in r:
                                    assistant_message = r.get("assistant_message")
                                    #break

                        if assistant_message:
                            await broadcast_message(assistant_message)
                            say(assistant_message)
                            #print(f"Broadcasted message: {assistant_message}")

            except Exception as e:
                print(f"Error processing message: {str(e)}")
                await websocket.send_text(f"Error: {str(e)}")

    except WebSocketDisconnect:
        print(f"WebSocket disconnected gracefully by {username}.")
    finally:
        active_connections.remove(websocket)
        await broadcast_log(f"WebSocket connection closed for {username}.")

# Function to broadcast log messages to all active WebSocket connections
async def broadcast_log(log: str):
    for connection in active_connections:
        try:
            await connection.send_json({"LOG": log}) # Proper JSON format
        except Exception as e:
            print(f"Error broadcasting log: {e}")

async def broadcast_message(message: str):
    #print(f"Attempting to broadcast message: {message}")
    for connection in active_connections:
        try:
            #print(f"Broadcasting message: {message}")
            await connection.send_json({"message": message})  # Proper JSON format
        except Exception as e:
            print(f"Error sending message to WebSocket: {e}")

# Add file upload API route using FastAPI
@app.post("/upload")
async def upload_file(file: UploadFile):
    try:
        content = await file.read()
        filename = file.filename
        print(f"Received file: {filename}")

        # Try to decode as UTF-8, fall back to handling as binary if it fails
        try:
            content_str = content.decode("utf-8")  # Decode the bytes to a string
            print(f"File {filename} decoded as UTF-8")
            # Process the text content (e.g., insert into memory)
            client.insert_archival_memory(agent_state.id, content_str)
        except UnicodeDecodeError:
            print(f"File {filename} could not be decoded as UTF-8, handling as binary.")
            
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
                    print(f"Extracted text from {filename} and added to archival memory.")
                except Exception as e:
                    print(f"Error processing PDF {filename}: {e}")
                    return {"message": f"Error processing PDF {filename}: {e}"}
            else:
                print(f"Binary file {filename} is not a supported type.")
                return {"message": f"Binary file {filename} is not a supported type."}

    except Exception as e:
        print(f"Error processing file {file.filename}: {e}")
        return {"message": f"Error processing file {file.filename}: {e}"}

    return {"message": f"Successfully processed {filename}"}

# Function to fetch calendar events
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
        return events

    except HttpError as error:
        print(f"An error occurred: {error}")
        return []

# Function to initialize the tasks.json file
def initialize_tasks_file():
    # Check if tasks.json exists and is not empty
    if not exists('tasks.json'):
        # If the file doesn't exist, create it with an empty list
        with open('tasks.json', 'w') as f:
            json.dump([], f)  # Initialize with an empty list
            print("Initialized tasks.json with an empty list.")

# Load tasks from tasks.json or initialize an empty list if file doesn't exist
if os.path.exists('tasks.json'):
    with open('tasks.json', 'r') as f:
        tasks = json.load(f)
else:
    tasks = []

@app.get("/api/calendar-events")
def get_calendar_events(token: str = Depends(verify_token)):
    events = fetch_google_calendar_events()
    return events

# Endpoint to get tasks from tasks.json
@app.get("/api/tasks")
def get_tasks(token: str = Depends(verify_token)):
    if not exists('./tasks.json'):
        return {"tasks": []}  # Return empty list if file doesn't exist

    with open('./tasks.json', 'r') as f:
        tasks = json.load(f)
    
    print(f"Tasks loaded from JSON: {tasks}")
    return {"tasks": tasks}

@app.post("/api/tasks/add")
async def add_task(task: dict = Body(...)):
    task_description = task.get("task")
    
    # Push task to agent memory and save it
    agent_state.memory.task_queue_push(task_description)
    return {"tasks": agent_state.memory["tasks"].value}
    
@app.get("/api/play-tts", response_class=FileResponse)
def play_tts(token: str = Depends(verify_token)):
    # Define the path to the latest generated TTS MP3 file
    file_path = "output.mp3"  # Replace with your actual path if necessary

    if os.path.exists(file_path):
        # Return the audio file if it exists
        return FileResponse(file_path, media_type="audio/mpeg", filename="output.mp3")
    else:
        # Return a 404 error if the file is not found
        raise HTTPException(status_code=404, detail="File not found")
    
@app.get("/auth/login")
async def login(request: Request):
    scopes = "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state"
    
    # Dynamically build the redirect_uri using the request object
    redirect_uri = f"{request.url.scheme}://{request.client.host}/auth/callback"
    
    auth_url = f"{SPOTIFY_AUTH_URL}?response_type=code&client_id={CLIENT_ID}&scope={scopes}&redirect_uri={redirect_uri}"
    return RedirectResponse(url=auth_url)

@app.get("/auth/callback")
async def spotify_callback(request: Request, code: str = Query(...)):
    token_url = "https://accounts.spotify.com/api/token"
    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post(token_url, data=body, headers=headers)

    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data["access_token"]

        # Get the base URL from the request (either localhost or external URL)
        base_url = str(request.base_url)
        # Construct the redirect URL dynamically
        redirect_url = f"{base_url}frontend?access_token={access_token}"
        
        return RedirectResponse(redirect_url)
    else:
        return {"error": "Failed to obtain access token"}

# Refresh Token Endpoint (optional)
@app.get("/auth/refresh")
async def refresh_token(refresh_token: str):
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    token_response = requests.post(TOKEN_URL, data=data)
    return token_response.json()

 # Include the router for authentication-related routes
app.include_router(auth_router)

# Define a wrapper function to call the async function
def send_wakeup_message_wrapper():
    asyncio.run(send_wakeup_message())  # Run the async function in a synchronous context

# Define your message sending function
async def send_wakeup_message():
    current_time = datetime.now().strftime("%H:%M:%S")
    message = f"Good morning! The time is {current_time}. Let's start the day!"
    say(message)  # Use the TTS function to speak the message
    await broadcast_message(message=message)  # Send the message over WebSocket

# Start the scheduler
scheduler.start()

# Schedule the wakeup message at 7:00 AM
scheduler.add_job(send_wakeup_message_wrapper, 'cron', hour=7, minute=0)

if __name__ == '__main__':
    #try:
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
    # finally:
    #     client.delete_agent(agent_id=agent_state.id)
    #     print(f"Deleted agent: {agent_state.name}")
