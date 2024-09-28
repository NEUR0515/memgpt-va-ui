import os
from dotenv import load_dotenv
from typing import List, Dict, Any
from memgpt.agent import Agent

# Load environment variables from .env file
load_dotenv()

def fetch_rss_feeds() -> List[Dict[str, Any]]:
    """
    Fetches and parses RSS feeds from the defined URLs.

    Returns:
        List[Dict[str, Any]]: A list of parsed entries from the RSS feeds.
    """
    import time
    import feedparser
    print("Fetching RSS feeds...")
    all_entries: List[Dict[str, Any]] = []

    # List of RSS Feeds
    RSS_FEEDS: List[str] = [
        "https://krebsonsecurity.com/feed/",
        "https://feeds.feedburner.com/TheHackersNews",
        "https://feeds.feedburner.com/exploit-db/jAi05Ol6OmB"
    ]

    for feed_url in RSS_FEEDS:
        try:
            print(f"Parsing feed: {feed_url}")
            feed = feedparser.parse(feed_url)
            if 'entries' in feed:
                # Sort entries by date (if available) and limit to top 10
                sorted_entries = sorted(feed.entries, key=lambda x: x.get('published_parsed', time.gmtime()), reverse=True)[:10]
                all_entries.extend(sorted_entries)
                print(f"Fetched and sorted {len(sorted_entries)} entries from {feed_url}")
            else:
                print(f"No entries found in feed: {feed_url}")
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {str(e)}")

    return all_entries


def filter_important_entries(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters RSS feed entries based on the defined important keywords.

    Args:
        entries (List[Dict[str, Any]]): A list of parsed RSS entries.

    Returns:
        List[Dict[str, Any]]: A list of entries that contain important keywords, limited to top 10.
    """
    # Optional: Define keywords to rank importance
    IMPORTANT_KEYWORDS: List[str] = ['exploit', 'ransomware', 'breach', 'zero-day', 'vulnerability', 'bug', 'hacker', 'cyber', 'attack']

    print("Filtering important entries...")
    important_entries: List[Dict[str, Any]] = []

    for entry in entries:
        if any(keyword.lower() in (entry.get('title', '').lower() or '') for keyword in IMPORTANT_KEYWORDS):
            important_entries.append(entry)

    if not important_entries:
        print("No entries matched the importance criteria, using default entries")
        return entries[:10]

    return important_entries[:10]


def fetch_security_news(self: Agent, entries_json: str) -> str:
    """
    Creates HTML content for the newsletter based on the filtered RSS entries.

    Args:
        entries_json (str): A JSON string representing the list of filtered RSS entries.

    Returns:
        str: The HTML content of the newsletter.
    """
    import json
    # Deserialize the JSON string back into a list of dictionaries
    try:
        # Ensure JSON is parsed into a list of dictionaries
        entries = json.loads(entries_json)
        
        if not isinstance(entries, list):
            raise ValueError("Expected a list of entries but received a different type.")
        
        print(f"Creating newsletter content from {len(entries)} entries...")

        newsletter_content = "<h1>Daily Security News</h1><ul>"
        for entry in entries:
            try:
                # Ensure entry is a dictionary and has the expected keys
                if isinstance(entry, dict) and "link" in entry and "title" in entry:
                    newsletter_content += f'<li><a href="{entry["link"]}">{entry["title"]}</a> - {entry.get("published", "Unknown date")}</li>'
                else:
                    print(f"Invalid entry structure: {entry}")
            except KeyError as e:
                print(f"Key error while processing entry: {e}")
        newsletter_content += "</ul>"
        return newsletter_content

    except json.JSONDecodeError:
        print("Failed to decode JSON string into entries.")
        return "Error: Invalid JSON input"


def send_security_newsletter(self: Agent, newsletter_content: str) -> str:
    """
    Sends the newsletter via email to the specified recipients.

    Args:
        newsletter_content (str): The HTML content of the newsletter.

    Returns:
        str: The status of the email send operation.
    """
    
    # Email Configuration
    EMAIL: str = os.getenv("USER_EMAIL", "")
    PASSWORD: str = os.getenv("USER_PASSWORD", "")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    PORT: int = int(os.getenv("SMTP_PORT", "587"))
    RECIPIENTS: List[str] = os.getenv("EMAIL_RECIPIENTS", "").split(",")    
    
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from logging.handlers import RotatingFileHandler
    print("Sending the newsletter...")
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Daily Security Newsletter"
        msg['From'] = EMAIL
        msg['To'] = ", ".join(RECIPIENTS)

        # Attach the newsletter content as HTML
        html_part = MIMEText(newsletter_content, 'html')
        msg.attach(html_part)

        # Send the email
        server = smtplib.SMTP(SMTP_SERVER, PORT)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.sendmail(EMAIL, RECIPIENTS, msg.as_string())
        server.quit()
        print("Newsletter sent successfully!")
        return "Newsletter sent successfully!"

    except smtplib.SMTPException as e:
        print(f"Error sending email: {str(e)}")
        return f"Failed to send newsletter: {str(e)}"
