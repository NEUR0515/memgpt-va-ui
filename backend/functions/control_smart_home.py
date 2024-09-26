from memgpt.agent import Agent
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

def control_home_assistant_device(self: Agent, entity_id: str, service: str, domain: str, payload: Optional[str] = None) -> str:
    """
    Sends a command to a device in Home Assistant (e.g., turning on/off a light).

    Args:
        entity_id (str): The entity ID of the device (e.g., light.living_room).
        service (str): The service to execute (e.g., 'turn_on', 'turn_off').
        domain (str): The domain of the entity (e.g., 'light', 'switch').
        payload (str, optional): Optional JSON string with additional data (e.g., brightness level). Defaults to None.

    Returns:
        str: The response from the Home Assistant API.
    """
    import os
    import requests
    import json
    api_url = os.getenv("HA_API_URL")
    token = os.getenv("HA_TOKEN")
    
    # Construct the URL for controlling a device
    url = f"{api_url}/services/{domain}/{service}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    # Parse the payload from JSON string to a dictionary if provided
    if payload:
        try:
            payload_dict = json.loads(payload)
        except json.JSONDecodeError:
            return "Invalid payload format. It must be a valid JSON string."
    else:
        payload_dict = {}

    # Add the entity_id to the payload
    payload_dict['entity_id'] = entity_id

    response = requests.post(url, headers=headers, json=payload_dict)

    if response.status_code == 200:
        return f"Successfully executed {service} on {entity_id}."
    else:
        return f"Failed to execute {service} on {entity_id}. Error: {response.status_code}, {response.text}"

# Example Usage for Controlling a Device
# print(control_home_assistant_device("light.lounge_light", "turn_on", "light"))