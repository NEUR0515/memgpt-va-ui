import json
import os
from fastapi import FastAPI, WebSocket, File, UploadFile, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from memgpt import create_client
from utils import say
import uvicorn
from dotenv import load_dotenv

load_dotenv()

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

# Create the client for the AI assistant
client = create_client(
    base_url="http://172.16.3.252:8083", token=os.environ["MEMGPT_TOKEN"]
)

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
                            agent_id="f1922785-680f-4604-9b92-05b75f4e896d",
                            message=command
                        )
                        for r in response.messages:
                            if "message" in r:
                                spoken_message = r["message"]
                                await broadcast_message(spoken_message)
                                print(f"AI Response: {spoken_message}")  # Print the response to the console
                                say(spoken_message)
                            # Example response handler for sending thought messages
                            if "internal_monologue" in r:
                                thought_message = {
                                    "type": "thought",
                                    "message": r["internal_monologue"]
                                }
                                await websocket.send_json(thought_message)
                            if "function_call" in r:
                                arguments = r['function_call']['arguments']
                                try:
                                    arguments_dict = eval(arguments)
                                    if 'message' in arguments_dict:
                                        response_message = {
                                            'type': 'response',
                                           'message': arguments_dict["message"]
                                        }
                                        await broadcast_message(response_message)
                                        await websocket.send_json(response_message)
                                        #await websocket.send_text(arguments_dict['message'])
                                        #print(f"RESPONSE: {arguments_dict['message']}")
                                        say(response_message['message'])
                                except Exception as e:
                                    await broadcast_log(f"Error processing arguments: {e}")
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
@app.post("/upload")
async def upload_file(file: UploadFile):
    content = await file.read()
    print(f"Received file: {file.filename}")
    # Process the file content here if needed
    return {"message": f"Processed file: {file.filename}"}

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000)
