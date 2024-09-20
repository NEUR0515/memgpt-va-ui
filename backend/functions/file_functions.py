from typing import TypedDict
from memgpt.agent import Agent
# Parameters specific to the read_file_tool
class ReadFileParams(TypedDict):
    file_path: str

def read_file(self: Agent, file_path: str) -> str:
    """
    Reads the content of the specified file.

    Args:
        self (Agent): The agent instance calling the function.
        file_path (str): The path to the file that will be read.
    
    Returns:
        str: The content of the file or an error message.
    """
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        return content
    except FileNotFoundError:
        return "File not found."
    except Exception as e:
        return f"An error occurred: {str(e)}"

# Parameters specific to the write_file_tool
class WriteFileParams(TypedDict):
    file_path: str
    content: str

def write_file(self: Agent, file_path: str, content: str) -> str:
    """
    Writes the given content to the specified file path.

    Args:
        self (Agent): The agent instance calling the function.
        file_path (str): The path to the file where the content will be written.
        content (str): The content that needs to be written to the file.
    
    Returns:
        str: A message indicating success or failure.
    """
    try:
        with open(file_path, 'w') as file:
            file.write(content)
        return f"Write successful to {file_path}."
    except Exception as e:
        return f"An error occurred while writing to the file: {str(e)}"
