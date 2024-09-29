from memgpt.agent import Agent
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
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    import os
    def get_calendar_service():
        TOKEN_PATH = os.path.join('..', 'backend', 'gcal_token.json')
        CREDENTIALS_PATH = os.path.join('..', 'backend', 'google_api_credentials.json')
        SCOPES = ["https://www.googleapis.com/auth/calendar"]
        
        creds = None
        if os.path.exists(TOKEN_PATH):
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(TOKEN_PATH, 'w') as token_file:
                token_file.write(creds.to_json())

        return build("calendar", "v3", credentials=creds)

    try:
        service = get_calendar_service()
        if not service:
            return "Failed to connect to Google Calendar service."

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

        event_result = service.events().insert(calendarId='primary', body=event).execute()
        return f"Event created: {event_result.get('htmlLink')}"

    except Exception as e:
        return f"An error occurred: {str(e)}"
