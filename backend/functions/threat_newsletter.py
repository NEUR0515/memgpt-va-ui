import os
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel
import datetime
from memgpt.agent import Agent

# Load environment variables from .env file
dotenv_path = os.path.join('..', '.env')
load_dotenv(dotenv_path)

# Email Configuration
EMAIL: str = os.getenv("USER_EMAIL", "")
PASSWORD: str = os.getenv("USER_PASSWORD", "")
SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
PORT: int = int(os.getenv("SMTP_PORT", "587"))
RECIPIENTS: List[str] = os.getenv("EMAIL_RECIPIENTS", "").split(",")

class FeedEntry(BaseModel):
    title: str
    link: str
    published: Optional[str] = None
    summary: Optional[str] = None
    # Include other fields you expect to use

def fetch_rss_feeds() -> List[FeedEntry]:
    """
    Fetches and parses RSS feeds from the defined URLs.

    Returns:
        List[FeedEntry]: A list of parsed entries from the RSS feeds.
    """
    import time
    import feedparser
    print("Fetching RSS feeds...")
    all_entries: List[FeedEntry] = []

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
                sorted_entries = sorted(
                    feed.entries,
                    key=lambda x: x.get('published_parsed', time.gmtime()),
                    reverse=True
                )[:10]
                # Convert entries to FeedEntry models
                feed_entries = [FeedEntry(**entry) for entry in sorted_entries]
                all_entries.extend(feed_entries)
                print(f"Fetched and sorted {len(feed_entries)} entries from {feed_url}")
            else:
                print(f"No entries found in feed: {feed_url}")
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {str(e)}")

    return all_entries

def filter_important_entries(entries: List[FeedEntry]) -> List[FeedEntry]:
    """
    Filters RSS feed entries based on the defined important keywords.

    Args:
        entries (List[FeedEntry]): A list of parsed RSS entries.

    Returns:
        List[FeedEntry]: A list of entries that contain important keywords, limited to top 10.
    """
    # Define keywords to rank importance
    IMPORTANT_KEYWORDS: List[str] = [
        'exploit', 'ransomware', 'breach', 'zero-day',
        'vulnerability', 'bug', 'hacker', 'cyber', 'attack'
    ]

    print("Filtering important entries...")
    important_entries: List[FeedEntry] = []

    for entry in entries:
        if any(keyword.lower() in (entry.title.lower() or '') for keyword in IMPORTANT_KEYWORDS):
            important_entries.append(entry)

    if not important_entries:
        print("No entries matched the importance criteria, using default entries")
        return entries[:10]

    return important_entries[:10]

def create_newsletter_content(entries: List[FeedEntry]) -> str:
    """
    Creates HTML content for the newsletter based on the filtered RSS entries.

    Args:
        entries (List[FeedEntry]): A list of filtered RSS entries.

    Returns:
        str: The HTML content of the newsletter.
    """
    print(f"Creating newsletter content from {len(entries)} entries...")

    newsletter_content = "<h1>Daily Security News</h1><ul>"
    for entry in entries:
        try:
            newsletter_content += f'<li><a href="{entry.link}">{entry.title}</a> - {entry.published or "Unknown date"}</li>'
        except Exception as e:
            print(f"Error while processing entry: {e}")
    newsletter_content += "</ul>"
    return newsletter_content

def fetch_security_newsletter(self: Agent) -> str:
    """
    Fetches and formats the security newsletter content.

    Returns:
        str: The HTML content of the newsletter.
    """
    entries = fetch_rss_feeds()
    filtered_entries = filter_important_entries(entries)
    newsletter_content = create_newsletter_content(filtered_entries)
    return newsletter_content

# Fetch the newsletter content
# print(fetch_security_newsletter())
