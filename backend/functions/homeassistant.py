import os
from dotenv import load_dotenv
from homeassistant_api import Client

load_dotenv()

api_url = os.getenv("HA_API_URL")
token = os.getenv("HA_TOKEN")

try:    
    if api_url is not None and token is not None:
        print("Connecting to HomeAssistant at {}".format(api_url))
        # Intitializes the main Client
        client = Client(api_url, token)
        # Verifies the extistence of the specified server and opens efficient ClientSessions.
        with client:
            print("Successfully connected to HomeAssistant")
            # Gets the light service domain
            light = client.get_domain("light")
            assert light is not None
            # Triggers the service with a specific garage door
            light.toggle(entity_id="light.office_leds")
except Exception as e:
    print("Error connecting to HomeAssistant: {}".format(e))