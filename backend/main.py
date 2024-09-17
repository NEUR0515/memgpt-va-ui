import json
import os
from os.path import join, dirname
import ast
import re
from fastapi import FastAPI, WebSocket, File, UploadFile, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from memgpt import create_client
from memgpt.agent import Agent
from memgpt.memory import ChatMemory
from utils import say
from functions.send_sms import send_text_message
from functions.gsearch import google_search
from functions.google_calendar import schedule_event
from functions.git_repo import create_git_repo
import uvicorn
from dotenv import load_dotenv

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

# Serve the React app's static files at a new path (like `/frontend`)
app.mount("/frontend", StaticFiles(directory="../frontend/build", html=True), name="static")

client = create_client()

# create send_text_message tool
sms_tool = client.create_tool(send_text_message, name="send_text_message")
print(f"Created tool: {sms_tool.name} with ID {str(sms_tool.id)}")
print(f"Tool schema: {json.dumps(sms_tool.json_schema, indent=4)}")

# create google search tool
search_tool = client.create_tool(google_search, name="google_search")
print(f"Created tool: {search_tool.name} with ID {str(search_tool.id)}")
print(f"Tool schema: {json.dumps(search_tool.json_schema, indent=4)}")

# create google calendar tool
schedule_tool = client.create_tool(schedule_event, name="schedule_event")
print(f"Created tool: {schedule_tool.name} with ID {str(schedule_tool.id)}")
print(f"Tool schema: {json.dumps(schedule_tool.json_schema, indent=4)}")

# create git repo tool
create_repo_tool = client.create_tool(create_git_repo, name="create_git_repo")
print(f"Created tool: {create_repo_tool.name} with ID {str(create_repo_tool.id)}")
print(f"Tool schema: {json.dumps(create_repo_tool.json_schema, indent=4)}")

persona = "You are Jarvis from the Iron Man series"

#human = "My name is Alfie"
with open('alfie.txt', 'r') as file:
    # Read the entire file content into a variable
    human = file.read()

# Create an agent
agent_state = client.create_agent(
    name="JarvisAssistant2", memory=ChatMemory(human=human, persona=persona), tools=[sms_tool.name, search_tool.name, schedule_tool.name, create_repo_tool.name]
)

print(f"Created agent: {agent_state.name} with ID {str(agent_state.id)}")

# Store active WebSocket connections
active_connections = set()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            command = json.loads(data).get('message', '').lower()

            if command:
                if "exit" in command or "stop" in command:
                    await websocket.close()
                else:
                    try:
                        response = client.user_message(
                            agent_id=agent_state.id,
                            message=command
                        )

                        for r in response.messages:
                            # Debug: Print the structure of each message in the response
                            #print(f"Response element: {r}")

                            spoken_message = None  # Initialize spoken_message to None

                            # Check if there's an assistant_message first
                            if "assistant_message" in r:
                                spoken_message = r.get("assistant_message")
                                #print(f"AI Response (assistant_message): {spoken_message}")
                                continue

                            # If no assistant_message, check the function_call for the message
                            elif "function_call" in r:
                                try:
                                    # Use regex to extract the JSON-like part from the function_call string
                                    match = re.search(r"send_message\((.*)\)", r["function_call"])
                                    if match:
                                        arguments = match.group(1)
                                        arguments_dict = ast.literal_eval(arguments)  # Safely evaluate the extracted string

                                        if 'message' in arguments_dict:
                                            spoken_message = arguments_dict["message"]
                                            #print(f"AI Response (function_call): {spoken_message}")
                                except Exception as e:
                                    await broadcast_log(f"Error processing function_call arguments: {e}")
                                    print(f"Error processing function_call: {e}")
                            
                            # If we have a spoken_message, broadcast and speak it
                            if spoken_message:
                                await broadcast_message(spoken_message)
                                #await websocket.send_text(spoken_message)
                                say(spoken_message)

                            # Handle internal_monologue (Thought messages)
                            thought_message = r.get("internal_monologue")
                            if thought_message:
                                thought_payload = {
                                    "type": "thought",
                                    "message": thought_message
                                }
                                await websocket.send_json(thought_payload)
                                print(f"Thought: {thought_message}")  # Optional: Print to console for logging purposes

                    except Exception as e:
                        await broadcast_log(f"Error processing request: {e}")
                        await websocket.send_text("Sorry, I encountered an error processing your request.")
            else:
                await websocket.send_text("I'm sorry. I didn't catch that.")
    except Exception as e:
        await broadcast_log(f"WebSocket Error: {e}")
    except WebSocketDisconnect as e:
        print(f"WebSocket disconnected: {e}")
        await broadcast_log(f"WebSocket disconnected: {e}")
    finally:
        active_connections.remove(websocket)
        await broadcast_log("WebSocket connection closed")


# Function to broadcast log messages to all active WebSocket connections
async def broadcast_log(log: str):
    for connection in active_connections:
        await connection.send_text(f"LOG: {log}")

async def broadcast_message(message: str):
    for connection in active_connections:
        try:
            print(f"Broadcasting message to WebSocket: {message}")  # Log the message to terminal
            await connection.send_text(message)  # Send the message to all WebSocket connections
        except Exception as e:
            print(f"Error sending message to WebSocket: {e}")

# Add file upload API route using FastAPI
# @app.post("/upload")
# async def upload_file(file: UploadFile):
#     content = await file.read()
#     print(f"Received file: {file.filename}")
#     # Process the file content here if needed
#     return {"message": f"Processed file: {file.filename}"}

if __name__ == '__main__':

    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        print("Shutting down...")
        # Delete agent
        client.delete_agent(agent_id=agent_state.id)
        print(f"Deleted agent: {agent_state.name} with ID {str(agent_state.id)}")
