from os.path import join, dirname
from typing import Optional, List
from memgpt import create_client
from memgpt.memory import ChatMemory, MemoryModule
from memgpt.agent import Agent
from functions.send_sms import send_text_message
from functions.gsearch import google_search
from functions.schedule_event import schedule_event
from functions.list_upcoming_events import list_upcoming_events
from functions.git_repo import create_git_repo
from functions.file_functions import read_file, write_file
from functions.website_crawler import analyse_website
from functions.query_smart_home import query_home_assistant
from functions.control_smart_home import control_home_assistant_device
from dotenv import load_dotenv

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Initialize the client and create tools
client = create_client()

class TaskMemory(ChatMemory):
    def __init__(self, human: str, persona: str, tasks: List[str]): 
        super().__init__(human=human, persona=persona) 
        self.memory["tasks"] = MemoryModule(limit=2000, value=tasks) # create an empty list 

    def task_queue_push(self, task_description: str) -> Optional[str]:
        """
        Push to a task queue stored in core memory. 

        Args:
            task_description (str): A description of the next task you must accomplish. 
            
        Returns:
            Optional[str]: None is always returned as this function does not produce a response.
        """
        self.memory["tasks"].value.append(task_description)
        return None

    def task_queue_pop(self) -> Optional[str]:
        """
        Get the next task from the task queue 
 
        Returns:
            Optional[str]: The description of the task popped from the queue, 
            if there are still tasks in queue. Otherwise, returns None (the 
            task queue is empty)
        """
        if len(self.memory["tasks"].value) == 0: 
            return None
        task = self.memory["tasks"].value[0]
        self.memory["tasks"].value = self.memory["tasks"].value[1:]
        return task

write_file_tool = client.create_tool(write_file, name="write_file")
read_file_tool = client.create_tool(read_file, name="read_file")
sms_tool = client.create_tool(send_text_message, name="send_text_message")
search_tool = client.create_tool(google_search, name="google_search")
schedule_event_tool = client.create_tool(schedule_event, name="schedule_event")
list_upcoming_events_tool = client.create_tool(list_upcoming_events, name="list_upcoming_events")
create_repo_tool = client.create_tool(create_git_repo, name="create_git_repo")
analyse_website_tool = client.create_tool(analyse_website, name="analyse_website")
query_home_assistant_tool = client.create_tool(query_home_assistant, name="query_home_assistant")
control_home_assistant_tool = client.create_tool(control_home_assistant_device, name="control_home_assistant_device")

with open('persona.txt', 'r') as file:
    persona = file.read()

with open('human.txt', 'r') as file:
    human = file.read()

# Initialize the agent with loaded tasks
agent_memory = TaskMemory(human=human, persona=persona, tasks=[])
agent_state = client.create_agent(
    name="Jarvis", memory=agent_memory,
    tools=[sms_tool.name, search_tool.name, schedule_event_tool.name, list_upcoming_events_tool.name, 
           create_repo_tool.name, read_file_tool.name, write_file_tool.name, 
           analyse_website_tool.name, query_home_assistant_tool.name, control_home_assistant_tool.name]
)

print(f"Created agent: {agent_state.name} with ID {str(agent_state.id)}")
