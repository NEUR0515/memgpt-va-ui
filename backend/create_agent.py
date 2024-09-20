from os.path import join, dirname
from memgpt import create_client
from memgpt.memory import ChatMemory
from functions.send_sms import send_text_message
from functions.gsearch import google_search
from functions.google_calendar import schedule_event
from functions.git_repo import create_git_repo
from functions.file_functions import read_file_tool, write_file_tool

from dotenv import load_dotenv

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Initialize the client and create tools
client = create_client()

create_file_tool = client.create_tool(write_file_tool, name="create_file")
read_file = client.create_tool(read_file_tool, name="read_file")
sms_tool = client.create_tool(send_text_message, name="send_text_message")
search_tool = client.create_tool(google_search, name="google_search")
schedule_tool = client.create_tool(schedule_event, name="schedule_event")
create_repo_tool = client.create_tool(create_git_repo, name="create_git_repo")

with open('jarvis.txt', 'r') as file:
    persona = file.read()

with open('alfie.txt', 'r') as file:
    human = file.read()

agent_state = client.create_agent(
    name="Jarvis", memory=ChatMemory(human=human, persona=persona),
    tools=[sms_tool.name, search_tool.name, schedule_tool.name, create_repo_tool.name]
)

print(f"Created agent: {agent_state.name} with ID {str(agent_state.id)}")
