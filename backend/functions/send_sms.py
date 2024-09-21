from memgpt.agent import Agent

def send_text_message(self: Agent, message: str, recipient: str) -> str:
    """
    Sends an SMS message to the recipient's phone / cellular device.

    Args:
        message (str): The contents of the message to send.
        recipient (str): The name of the recipient for the message.

    Returns:
        str: The status of the text message.
    """
    import os
    import traceback
    from twilio.rest import Client
    # Import the names and phone numbers from environment variables
    user1_name = os.getenv("USER1_NAME", "User1")  # Default to "User1" if not provided
    user2_name = os.getenv("USER2_NAME", "User2")  # Default to "User2" if not provided
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    client = Client(account_sid, auth_token)

    from_number = os.getenv("TWILIO_FROM_NUMBER")

    # Define a dictionary mapping recipients to their phone numbers
    recipients = {
        user1_name: os.getenv("USER1_PHONE_NUMBER"),
        user2_name: os.getenv("USER2_PHONE_NUMBER")
        # Add more recipients as needed
    }

    # Look up the phone number for the recipient
    to_number = recipients.get(recipient)

    # Check if recipient exists in the dictionary
    if not to_number:
        return f"Recipient '{recipient}' not found."

    try:
        message = client.messages.create(
            body=str(message),
            from_=from_number,
            to=to_number,
        )
        return "Message was successfully sent."

    except Exception as e:
        traceback.print_exc()
        return f"Message failed to send with error: {str(e)}"
