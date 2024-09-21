import feedparser
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from logging.handlers import RotatingFileHandler
import os
from dotenv import load_dotenv
from typing import List, Dict, Any
from memgpt.agent import Agent
import time
# Load environment variables from .env file
load_dotenv()

# Set up logging
logger = logging.getLogger('SecurityNewsletter')
logger.setLevel(logging.DEBUG)

# Create file handler to log to file (rotates after 5MB, keeps 3 backups)
handler = RotatingFileHandler('security_newsletter.log', maxBytes=5*1024*1024, backupCount=3)
handler.setLevel(logging.DEBUG)

# Create console handler to log to console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Format logging
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(handler)
logger.addHandler(console_handler)

# List of RSS Feeds
RSS_FEEDS: List[str] = [
    "https://krebsonsecurity.com/feed/",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://feeds.feedburner.com/exploit-db/jAi05Ol6OmB"
]

# Email Configuration
EMAIL: str = os.getenv("USER_EMAIL", "")
PASSWORD: str = os.getenv("USER_PASSWORD", "")
SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
PORT: int = int(os.getenv("SMTP_PORT", "587"))
RECIPIENTS: List[str] = os.getenv("EMAIL_RECIPIENTS", "").split(",")

# Optional: Define keywords to rank importance
IMPORTANT_KEYWORDS: List[str] = ['exploit', 'ransomware', 'breach', 'zero-day', 'vulnerability', 'bug', 'hacker', 'cyber', 'attack']


def fetch_rss_feeds(self: Agent) -> List[Dict[str, Any]]:
    """
    Fetches and parses RSS feeds from the defined URLs.

    Returns:
        List[Dict[str, Any]]: A list of parsed entries from the RSS feeds.
    """
    logger.info("Fetching RSS feeds...")
    all_entries: List[Dict[str, Any]] = []

    for feed_url in RSS_FEEDS:
        try:
            logger.debug(f"Parsing feed: {feed_url}")
            feed = feedparser.parse(feed_url)
            if 'entries' in feed:
                # Sort entries by date (if available) and limit to top 10
                sorted_entries = sorted(feed.entries, key=lambda x: x.get('published_parsed', time.gmtime()), reverse=True)[:10]
                all_entries.extend(sorted_entries)
                logger.info(f"Fetched and sorted {len(sorted_entries)} entries from {feed_url}")
            else:
                logger.warning(f"No entries found in feed: {feed_url}")
        except Exception as e:
            logger.error(f"Error fetching feed {feed_url}: {str(e)}")

    return all_entries


def filter_important_entries(self: Agent, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters RSS feed entries based on the defined important keywords.

    Args:
        entries (List[Dict[str, Any]]): A list of parsed RSS entries.

    Returns:
        List[Dict[str, Any]]: A list of entries that contain important keywords, limited to top 10.
    """
    logger.info("Filtering important entries...")
    important_entries: List[Dict[str, Any]] = []

    for entry in entries:
        if any(keyword.lower() in (entry.get('title', '').lower() or '') for keyword in IMPORTANT_KEYWORDS):
            important_entries.append(entry)

    if not important_entries:
        logger.warning("No entries matched the importance criteria, using default entries")
        return entries[:10]

    return important_entries[:10]


def create_newsletter_content(self: Agent, entries: List[Dict[str, Any]]) -> str:
    """
    Creates HTML content for the newsletter based on the filtered RSS entries.

    Args:
        entries (List[Dict[str, Any]]): A list of filtered RSS entries.

    Returns:
        str: The HTML content of the newsletter.
    """
    logger.info(f"Creating newsletter content from {len(entries)} entries...")
    newsletter_content = "<h1>Daily Security News</h1><ul>"
    for entry in entries:
        try:
            newsletter_content += f'<li><a href="{entry["link"]}">{entry["title"]}</a> - {entry.get("published", "Unknown date")}</li>'
        except KeyError as e:
            logger.warning(f"Key error while processing entry: {e}")
    newsletter_content += "</ul>"
    return newsletter_content


def send_newsletter(self: Agent, newsletter_content: str) -> str:
    """
    Sends the newsletter via email to the specified recipients.

    Args:
        newsletter_content (str): The HTML content of the newsletter.

    Returns:
        str: The status of the email send operation.
    """
    logger.info("Sending the newsletter...")
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
        logger.info("Newsletter sent successfully!")
        return "Newsletter sent successfully!"

    except smtplib.SMTPException as e:
        logger.error(f"Error sending email: {str(e)}")
        return f"Failed to send newsletter: {str(e)}"


def fetch_security_news(self: Agent) -> str:
    """
    Fetches the security news from RSS feeds and generates the newsletter content.

    Returns:
        str: The HTML content of the security newsletter.
    """
    entries = self.fetch_rss_feeds()
    important_entries = self.filter_important_entries(entries)
    newsletter_content = self.create_newsletter_content(important_entries)
    return newsletter_content


def send_security_newsletter(self: Agent) -> str:
    """
    Fetches the security news and sends it as an email newsletter.

    Returns:
        str: The status of the email send operation.
    """
    newsletter_content = self.fetch_security_news()
    return self.send_newsletter(newsletter_content)
