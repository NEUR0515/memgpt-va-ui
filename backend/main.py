import json
import os
from os.path import join, dirname
import ast
import re
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from memgpt import create_client
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
app.mount("/frontend", StaticFiles(directory="../frontend/build", html=True), name="frontend")
app.mount("/img", StaticFiles(directory="../frontend/public/img"), name="img")

# Initialize the client and create tools
client = create_client()

sms_tool = client.create_tool(send_text_message, name="send_text_message")
search_tool = client.create_tool(google_search, name="google_search")
schedule_tool = client.create_tool(schedule_event, name="schedule_event")
create_repo_tool = client.create_tool(create_git_repo, name="create_git_repo")

# Persona and agent creation
persona = "You are Jarvis from the Iron Man series"
with open('alfie.txt', 'r') as file:
    human = file.read()

agent_state = client.create_agent(
    name="JarvisBot", memory=ChatMemory(human=human, persona=persona),
    tools=[sms_tool.name, search_tool.name, schedule_tool.name, create_repo_tool.name]
)

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
                        if response.messages:
                            for r in response.messages:
                                if "assistant_message" in r:
                                    spoken_message = r.get("assistant_message")
                                    break  # Ensure only one assistant message is handled

                                elif "function_call" in r:
                                    match = re.search(r"send_message\((.*)\)", r["function_call"])
                                    if match:
                                        arguments = match.group(1)
                                        arguments_dict = ast.literal_eval(arguments)
                                        if 'message' in arguments_dict:
                                            spoken_message = arguments_dict["message"]
                                            break  # Ensure only one function call message is handled

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


if __name__ == '__main__':
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        client.delete_agent(agent_id=agent_state.id)
        print(f"Deleted agent: {agent_state.name}")
