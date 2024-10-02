from memgpt.agent import Agent

def analyse_website(self: Agent, url: str) -> str:
    """
    Crawls and analyses a given website address

    Args:
        url (str): The url to analyse

    Returns:
        str: The content of the website.
    """
    import traceback
    import os
    from firecrawl import FirecrawlApp
    from dotenv import load_dotenv

    load_dotenv()

    app = FirecrawlApp(api_key=os.getenv("FIRECRAWL_API_KEY"))

    try:
        # Use a different variable name to avoid confusion
        response = app.crawl_url(
            url,
            params={
                'limit': 50,  # Number of pages to crawl
                'scrapeOptions': {'formats': ['markdown']}  # Format to return
            },
            poll_interval=30
        )
        
        # Print the full response for debugging purposes
        #print(response)
        
        # Extract the markdown data
        website_contents = response['data'][0]['markdown']
        
        # Return the extracted markdown content
        return website_contents

    except Exception as e:
        traceback.print_exc()
        return f"Message failed to crawl with error: {str(e)}"

# Example usage
# print(analyse_website(url="https://firecrawl.dev"))