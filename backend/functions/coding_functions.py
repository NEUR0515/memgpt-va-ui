from memgpt.agent import Agent

def read_and_identify_code(self: Agent, file_name: str) -> tuple:
    """
    Reads the code from a file and identifies the language based on the file extension.
    
    Args:
        file_name (str): The name of the code file.
        
    Returns:
        tuple: (code, language) where code is the string content of the file and 
               language is inferred based on the file extension.
    """
    language_map = {
        '.py': 'python',
        '.ts': 'typescript',
        '.sh': 'shell'
    }

    # Read the file content
    try:
        with open(file_name, 'r') as file:
            code = file.read()

        # Infer the language from the file extension
        file_extension = file_name.split('.')[-1]
        language = language_map.get(f".{file_extension}", 'python')  # Default to python

        return code, language
    except FileNotFoundError:
        return f"Error: File {file_name} not found.", None

def start_code_execution_container(self: Agent, language: str) -> str:
    """
    Starts a Docker container based on the identified programming language.

    Args:
        language (str): The programming language (e.g., 'python', 'typescript', 'shell').

    Returns:
        str: The ID of the started Docker container.
    """
    import docker
    try:
        client = docker.from_env()
        
        # Map languages to Docker images
        image_map = {
            'python': 'python-sandbox',
            'typescript': 'typescript-sandbox',
            'shell': 'shell-sandbox'
        }
        image = image_map.get(language, 'python-sandbox')  # Default to Python

        container = client.containers.run(
            image, 
            stdin_open=True, 
            tty=True, 
            detach=True, 
            remove=True
        )
        return container.id
    except Exception as e:
        return f"Error starting container: {str(e)}"

def install_dependencies(self: Agent, container_id: str, language: str, project_files: dict) -> str:
    """
    Automatically installs dependencies in the Docker container based on the provided files.
    
    Args:
        container_id (str): The ID of the running Docker container.
        language (str): The language of the code (e.g., 'python', 'typescript').
        project_files (dict): A dictionary with filenames and their contents.

    Returns:
        str: The result of the dependency installation.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)

        # Check for a dependencies file (requirements.txt for Python, package.json for TypeScript)
        if language == 'python' and 'requirements.txt' in project_files:
            exec_result = container.exec_run(cmd="pip install -r /sandbox/requirements.txt")
        elif language == 'typescript' and 'package.json' in project_files:
            exec_result = container.exec_run(cmd="npm install", workdir="/sandbox")
        else:
            return "No dependency file found."

        if exec_result.exit_code == 0:
            return "Dependencies installed successfully."
        else:
            return f"Error during dependency installation: {exec_result.output.decode('utf-8')}"
    except Exception as e:
        return f"Error installing dependencies: {str(e)}"

def install_dependencies_wrapper(self: Agent, container_id: str, language: str, project_files_json: str) -> str:
    """
    Wrapper function that accepts a JSON string for project files.

    Args:
        container_id (str): The ID of the running Docker container.
        language (str): The language of the code (e.g., 'python', 'typescript').
        project_files_json (str): A JSON string containing filenames and file contents.

    Returns:
        str: The result of the dependency installation.
    """
    import json
    # Deserialize the JSON string back into a dictionary
    project_files = json.loads(project_files_json)

    # Call the underlying install_dependencies function
    return install_dependencies(container_id, language, project_files)

def execute_code_in_container(self: Agent, container_id: str, code: str, language: str) -> str:
    """
    Executes the provided code inside the Docker container.

    Args:
        container_id (str): The ID of the running Docker container.
        code (str): The code to execute.
        language (str): The programming language of the code (e.g., 'python', 'typescript', 'shell').

    Returns:
        str: The result or output from executing the code.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)

        # Define the command based on the language
        exec_commands = {
            'python': "python -c",
            'typescript': "ts-node -e",
            'shell': "bash -c"
        }
        exec_command = exec_commands.get(language, "python -c")

        # Execute the code inside the container
        exec_result = container.exec_run(cmd=f"{exec_command} '{code}'", workdir="/sandbox")
        
        # Return the result or error
        if exec_result.exit_code == 0:
            return exec_result.output.decode('utf-8')
        else:
            return f"Error executing code: {exec_result.output.decode('utf-8')}"
    except Exception as e:
        return f"Error executing code: {str(e)}"

def capture_logs(self: Agent, container_id: str) -> str:
    """
    Captures and returns the logs from the Docker container for debugging purposes.

    Args:
        container_id (str): The ID of the running Docker container.

    Returns:
        str: The logs generated during execution.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)

        logs = container.logs().decode('utf-8')
        return logs
    except Exception as e:
        return f"Error capturing logs: {str(e)}"

def handle_code_execution(self: Agent, file_name: str) -> str:
    """
    Handles the end-to-end process of reading, executing, and debugging code.

    Args:
        file_name (str): The name of the code file to execute.
    
    Returns:
        str: The result or debugging output from the code execution.
    """
    # Step 1: Read the code and identify its language
    code, language = read_and_identify_code(file_name)
    if language is None:
        return code  # Error message

    # Step 2: Start a container for the identified language
    container_id = start_code_execution_container(language)
    if "Error" in container_id:
        return container_id  # Error starting container

    # (Optional) Step 3: Install dependencies (if any)
    project_files = {
        "requirements.txt": "requests\nnumpy"  # Simulate a requirements.txt file for testing
    }
    install_result = install_dependencies(container_id, language, project_files)
    if "Error" in install_result:
        return install_result  # Error installing dependencies

    # Step 4: Execute the code in the container
    exec_result = execute_code_in_container(container_id, code, language)
    if "Error" in exec_result:
        # Step 5: If an error occurs, capture logs for debugging
        logs = capture_logs(container_id)
        return f"Execution failed. Debug logs:\n{logs}"
    
    return exec_result  # Return the successful result of code execution
