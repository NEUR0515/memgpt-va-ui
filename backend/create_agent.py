from os.path import join, dirname
from typing import Optional, List
from memgpt import create_client
from memgpt.memory import ChatMemory, MemoryModule
from tools import all_tools
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

with open('persona.txt', 'r') as file:
    persona = file.read()

with open('human.txt', 'r') as file:
    human = file.read()

# Initialize the agent with loaded tasks
agent_memory = TaskMemory(human=human, persona=persona, tasks=[])
agent_state = client.create_agent(
    name="Jarvis", memory=agent_memory,
    tools=[tool.name for tool in all_tools]
)

print(f"Created agent: {agent_state.name} with ID {str(agent_state.id)}")
