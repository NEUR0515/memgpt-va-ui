from memgpt.agent import Agent
# Function to generate an image based on a text prompt and return the image URL
def create_image(self: Agent, prompt: str) -> str:
    """
    Sends a prompt to OpenAI to generate an image and returns the image URL.

    Args:
        prompt (str): The prompt to generate the image.

    Returns:
        str: The URL of the generated image.
    """
    import os
    from memgpt.credentials import MemGPTCredentials
    from openai import OpenAI
    # Set your OpenAI API key
    credentials = MemGPTCredentials().load()
    assert credentials.openai_key is not None, credentials.openai_key
    # model = "gpt-4-1106-preview"
    model = "gpt-4o"

    client = OpenAI(api_key=credentials.openai_key)

    # Send the request to OpenAI to generate an image
    response = client.images.generate(
        prompt=prompt,
        n=1,  # Number of images to generate
        size="512x512"  # Image size
    )

    # Extract the URL of the generated image from the response
    image_url = response.data[0].url

    return image_url

# Example usage:
#image_url = create_image_url("A futuristic city skyline at sunset")
#print(f"Generated Image URL: {image_url}")
