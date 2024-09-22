import json
from os.path import join, dirname, exists
import ast
import re
from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from memgpt import create_client, memory
from utils import say
import uvicorn
from dotenv import load_dotenv
import io
from PyPDF2 import PdfReader
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import datetime
import pytz

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# FastAPI app
app = FastAPI()

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the correct static directory to serve the JS and CSS files
app.mount("/static", StaticFiles(directory="../frontend/build/static"), name="static")
app.mount("/frontend", StaticFiles(directory="../frontend/build", html=True), name="frontend")
app.mount("/img", StaticFiles(directory="../frontend/public/img"), name="img")

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
    
client.attach_source_to_agent(source_state.id, agent_id=agent_state.id)
# Store active WebSocket connections
active_connections = set()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    print("WebSocket connection accepted.")

    try:
        while True:
            try:
                # Receive the incoming message
                data = await websocket.receive_text()
                message = json.loads(data)

                print(f"Received message: {message.get('message')}")

            except WebSocketDisconnect:
                print("WebSocket disconnected by client.")
                break

            try:
                command = json.loads(data).get('message', '').lower()
                print(f"Processing command: {command}")

                if command:
                    if "exit" in command or "stop" in command:
                        await websocket.close()
                        print("WebSocket closed on 'exit' or 'stop' command.")
                        break
                    else:
                        response = client.user_message(
                            agent_id=agent_state.id,
                            message=command
                        )
                        # Handle thought messages separately if they exist
                        thought_message = response.messages[0].get("internal_monologue")
                        if thought_message:
                            thought_payload = {
                                "type": "thought",
                                "message": thought_message
                            }
                            await websocket.send_json(thought_payload)
                            print(f"Sent thought message: {thought_message}")

                        # Consolidate message broadcasting to avoid duplicates
                        spoken_message = None

                        # Check assistant message first
                        spoken_message = None  # Initialize spoken_message as None

                        if response.messages:
                            for r in response.messages:
                                if "assistant_message" in r:
                                    spoken_message = r.get("assistant_message")
                                    print(f"Assistant message found: {spoken_message}")
                                    break  # Ensure only one assistant message is handled

                                elif "function_call" in r:
                                    print(f"Function call found: {r['function_call']}")
                                    match = re.search(r"send_message\((.*)\)", r["function_call"])
                                    if match:
                                        try:
                                            arguments = match.group(1)
                                            arguments_dict = ast.literal_eval(arguments)  # Safely evaluate the arguments
                                            print(f"Extracted arguments: {arguments_dict}")
                                            if 'message' in arguments_dict:
                                                spoken_message = arguments_dict["message"]
                                                print(f"Message from function call: {spoken_message}")
                                                #break  # Ensure only one function call message is handled
                                        except (SyntaxError, ValueError) as e:
                                            print(f"Error parsing function call arguments: {e}")
                                    else:
                                        print("No match found for 'send_message' function call")

                        # After loop, check if spoken_message is still None or empty
                        if not spoken_message:
                            print("No valid assistant message or function call message found.")

                        if spoken_message:
                            await broadcast_message(spoken_message)
                            say(spoken_message)
                            #print(f"Broadcasted message: {spoken_message}")

            except Exception as e:
                print(f"Error processing message: {str(e)}")
                await websocket.send_text(f"Error: {str(e)}")

    except WebSocketDisconnect:
        print("WebSocket disconnected gracefully.")
    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
    finally:
        active_connections.remove(websocket)
        print("WebSocket connection closed.")
        await broadcast_log("WebSocket connection closed")

# Function to broadcast log messages to all active WebSocket connections
async def broadcast_log(log: str):
    for connection in active_connections:
        try:
            await connection.send_json({"LOG": log}) # Proper JSON format
        except Exception as e:
            print(f"Error broadcasting log: {e}")

async def broadcast_message(message: str):
    print(f"Attempting to broadcast message: {message}")
    for connection in active_connections:
        try:
            print(f"Broadcasting message: {message}")
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
    TOKEN_PATH = os.path.expanduser("~/.memgpt/gcal_token.json")
    CREDENTIALS_PATH = os.path.expanduser("~/.memgpt/google_api_credentials.json")
    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('calendar', 'v3', credentials=creds)
    
    # Define the Europe/London time zone
    london_tz = pytz.timezone('Europe/London')

    # Get the current time in the Europe/London time zone
    now = datetime.datetime.now(london_tz).isoformat()

    # Call the Calendar API to fetch events in Europe/London time zone
    events_result = service.events().list(
        calendarId='primary',
        timeMin=now,
        timeZone='Europe/London',  # Specify the time zone for the query
        maxResults=10,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    events = events_result.get('items', [])
    
    return events

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
def get_calendar_events():
    events = fetch_google_calendar_events()
    return events

# Endpoint to get tasks from tasks.json
@app.get("/api/tasks")
def get_tasks():
    if not exists('./tasks.json'):
        return {"tasks": []}  # Return empty list if file doesn't exist

    with open('./tasks.json', 'r') as f:
        tasks = json.load(f)
    
    # Debugging output
    print(f"Tasks loaded from JSON: {tasks}")
    return {"tasks": tasks}

@app.post("/api/tasks/add")
async def add_task(task: dict = Body(...)):
    task_description = task.get("task")
    
    # Push task to agent memory and save it
    agent_state.memory.task_queue_push(task_description)
    
    return {"tasks": agent_state.memory["tasks"].value}

if __name__ == '__main__':
    #try:
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
    # finally:
    #     client.delete_agent(agent_id=agent_state.id)
    #     print(f"Deleted agent: {agent_state.name}")
