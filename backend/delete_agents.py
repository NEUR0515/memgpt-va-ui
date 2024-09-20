from memgpt import create_client

# Initialize the client
client = create_client()

# List all agents
agents = client.list_agents()

# Iterate through the agents and delete them
for agent in agents:
    # Access agent attributes using dot notation instead of subscripting
    client.delete_agent(agent.id)  # Use `agent.id` assuming `id` is an attribute
    print(f"Deleted agent {agent.id}")

# Confirm deletion
remaining_agents = client.list_agents()
print("Remaining agents:", remaining_agents)
