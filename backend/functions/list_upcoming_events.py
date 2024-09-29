from memgpt.agent import Agent
def list_upcoming_events(self: Agent, max_results: int = 10) -> str:
    """
    List upcoming events from the user's Google Calendar.
    
    Args:
        self (Agent): The MemGPT agent object.
        max_results (int): Maximum number of events to retrieve.
    
    Returns:
        str: A list of upcoming events or an error message.
    """
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    import os
    from datetime import datetime
    import pytz

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
        # Get the current time in Europe/London time zone with DST awareness
        london_tz = pytz.timezone("Europe/London")
        now = datetime.now(london_tz).isoformat()

        service = get_calendar_service()
        if not service:
            return "Failed to connect to Google Calendar service."

        # Use timeMin to filter for events starting after the current time in Europe/London
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,  # Only get events starting after the current time
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
        if not events:
            return "No upcoming events found."

        # Create a list of event summaries with their start time
        event_list = [
            f"{event['start'].get('dateTime', event['start'].get('date'))}: {event['summary']}"
            for event in events
        ]
        return "\n".join(event_list)

    except Exception as e:
        return f"An error occurred: {str(e)}"
