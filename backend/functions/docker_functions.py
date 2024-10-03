from memgpt.agent import Agent
import json

def start_docker_container(self: Agent, container_id: str) -> str:
    """
    Starts the Docker container to begin exexution.

    Args:
        container_id (str): The ID of the running Docker container.

    Returns:
        str: Status message indicating the result of the start action.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)
        
        # Start the container
        container.start()
        return f"Container {container_id} started."
    except Exception as e:
        return f"Error starting container {container_id}: {str(e)}"

def stop_docker_container(self: Agent, container_id: str) -> str:
    """
    Stops and removes the Docker container after execution.

    Args:
        container_id (str): The ID of the running Docker container.

    Returns:
        str: Status message indicating the result of the stop action.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)
        
        # Stop and remove the container
        container.stop()
        return f"Container {container_id} stopped and removed."
    except Exception as e:
        return f"Error stopping container: {str(e)}"
