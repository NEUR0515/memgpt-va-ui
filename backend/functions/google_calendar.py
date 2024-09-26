from memgpt.agent import Agent
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os

# Define paths for token and credentials
TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'gcal_token.json')
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'google_api_credentials.json')
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# This function is used to get the Google Calendar API service
def get_calendar_service():
    creds = None
    # Load credentials from file if available
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    
    # If credentials are not valid, refresh or get new ones
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the new credentials for future use
        with open(TOKEN_PATH, 'w') as token_file:
            token_file.write(creds.to_json())

    # Build the calendar service using credentials
    service = build("calendar", "v3", credentials=creds)
    return service

# Tool for scheduling an event
def schedule_event(self: Agent, title: str, start: str, end: str, description: str = None) -> str:
    """
    Schedule an event on the user's Google Calendar.
    
    Args:
        self (Agent): The MemGPT agent object.
        title (str): Event title.
        start (str): Start time in ISO 8601 format (e.g., "2024-02-01T12:00:00-07:00").
        end (str): End time in ISO 8601 format (e.g., "2024-02-01T14:00:00-07:00").
        description (str): Optional description for the event.
    
    Returns:
        str: Confirmation message with event link or an error message.
    """
    try:
        # Get the calendar service
        service = get_calendar_service()
        if not service:
            return "Failed to connect to Google Calendar service."

        # Create the event details
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start,
                'timeZone': 'Europe/London',
            },
            'end': {
                'dateTime': end,
                'timeZone': 'Europe/London',
            },
        }

        # Insert the event into the calendar
        event_result = service.events().insert(calendarId='primary', body=event).execute()
        return f"Event created: {event_result.get('htmlLink')}"

    except Exception as e:
        return f"An error occurred: {str(e)}"

# Tool for listing upcoming events
def list_upcoming_events(self: Agent, max_results: int = 10) -> str:
    """
    List upcoming events from the user's Google Calendar.
    
    Args:
        self (Agent): The MemGPT agent object.
        max_results (int): Maximum number of events to retrieve.
    
    Returns:
        str: A list of upcoming events or an error message.
    """
    try:
        # Get the calendar service
        service = get_calendar_service()
        if not service:
            return "Failed to connect to Google Calendar service."

        # Retrieve the events from the calendar
        events_result = service.events().list(
            calendarId='primary', maxResults=max_results,
            singleEvents=True, orderBy='startTime'
        ).execute()

        # Extract and format the events
        events = events_result.get('items', [])
        if not events:
            return "No upcoming events found."

        event_list = [f"{event['start'].get('dateTime', event['start'].get('date'))}: {event['summary']}" for event in events]
        return "\n".join(event_list)

    except Exception as e:
        return f"An error occurred: {str(e)}"
