from dotenv import load_dotenv
from memgpt.agent import Agent

load_dotenv()

def query_home_assistant(self: Agent, entity_id: str, attribute: str = None) -> str:
    """
    Queries the Home Assistant API to get the state of a device or send a command to a device.

    Args:
        entity_id (str): The entity ID of the device (e.g., light.living_room).
        attribute (str, optional): The specific attribute to query (e.g., brightness, temperature). Defaults to None.

    Returns:
        str: The state or specific attribute of the device.
    """
    import requests
    import os
    api_url = os.getenv("HA_API_URL")
    token = os.getenv("HA_TOKEN")
    
    url = f"{api_url}/states/{entity_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    data = response.json()

    # Return the entire state or a specific attribute if provided
    if attribute:
        return data['attributes'].get(attribute, "Attribute not available")
    return data['state']

