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
        'py': 'python',
        'ts': 'typescript',
        'sh': 'shell'
    }

    try:
        with open(file_name, 'r') as file:
            code = file.read()

        file_extension = file_name.split('.')[-1]
        language = language_map.get(file_extension, 'python')  # Default to Python

        return code, language
    except FileNotFoundError:
        return f"Error: File {file_name} not found.", None

def gather_project_files(self: Agent, directory: str) -> dict:
    """
    Gathers project files from the specified directory (e.g., requirements.txt or package.json).

    Args:
        directory (str): The directory where the project files are located.

    Returns:
        dict: A dictionary of filenames and their contents, or an error string.
    """
    import os
    project_files = {}
    try:
        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            if filename in ['requirements.txt', 'package.json']:  # Extendable to other files
                with open(filepath, 'r') as file:
                    project_files[filename] = file.read()
        return project_files
    except Exception as e:
        return f"Error gathering project files: {str(e)}"

def start_code_execution_container(self: Agent, language: str) -> str:
    """
    Starts a Docker container based on the identified programming language.

    Args:
        language (str): The programming language.

    Returns:
        str: The ID of the started Docker container or an error message.
    """
    import docker
    try:
        client = docker.from_env()
        image_map = {
            'python': 'python-sandbox',
            'typescript': 'typescript-sandbox',
            'shell': 'shell-sandbox'
        }
        image = image_map.get(language, 'python-sandbox')

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

def install_dependencies(self: Agent, container_id: str, language: str, project_files_json: str) -> str:
    """
    Automatically installs dependencies in the Docker container based on the provided files.

    Args:
        container_id (str): The ID of the running Docker container.
        language (str): The language of the code (e.g., 'python', 'typescript').
        project_files_json (str): A JSON string with filenames and their contents.

    Returns:
        str: The result of the dependency installation.
    """
    import json, docker
    try:
        project_files = json.loads(project_files_json)
        client = docker.from_env()
        container = client.containers.get(container_id)

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

def execute_code_in_container(self: Agent, container_id: str, code: str, language: str) -> str:
    """
    Executes the provided code inside the Docker container.

    Args:
        container_id (str): The ID of the running Docker container.
        code (str): The code to execute.
        language (str): The programming language of the code.

    Returns:
        str: The result or output from executing the code.
    """
    import docker
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)

        # Save the code to a temporary file inside the container
        if language == 'python':
            file_path = '/sandbox/temp_code.py'
            container.put_archive("/sandbox", create_tar_with_file("temp_code.py", code))
            exec_command = f"python {file_path}"
        elif language == 'typescript':
            file_path = '/sandbox/temp_code.ts'
            container.put_archive("/sandbox", create_tar_with_file("temp_code.ts", code))
            exec_command = f"ts-node {file_path}"
        elif language == 'shell':
            file_path = '/sandbox/temp_code.sh'
            container.put_archive("/sandbox", create_tar_with_file("temp_code.sh", code))
            exec_command = f"bash {file_path}"
        else:
            return f"Unsupported language: {language}"

        # Execute the file in the container
        exec_result = container.exec_run(cmd=exec_command, workdir="/sandbox")

        if exec_result.exit_code == 0:
            return exec_result.output.decode('utf-8')
        else:
            return f"Error executing code: {exec_result.output.decode('utf-8')}"
    except Exception as e:
        return f"Error executing code: {str(e)}"

def create_tar_with_file(filename: str, content: str) -> bytes:
    """
    Creates a tar archive containing a single file with the provided content.

    Args:
        filename (str): The name of the file to create in the tar archive.
        content (str): The content to write to the file.

    Returns:
        bytes: The tar archive as a byte string.
    """
    import io
    import tarfile

    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode='w') as tar:
        file_data = content.encode('utf-8')
        tarinfo = tarfile.TarInfo(name=filename)
        tarinfo.size = len(file_data)
        tar.addfile(tarinfo, io.BytesIO(file_data))
    
    tar_stream.seek(0)
    return tar_stream.read()

def capture_container_logs(self: Agent, container_id: str) -> str:
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

def handle_code_execution(self: Agent, file_name: str, project_directory: str = "/sandbox") -> str:
    """
    Handles the end-to-end process of reading, executing, and debugging code.

    Args:
        file_name (str): The name of the code file to execute.
        project_directory (str): The directory where project files are located.

    Returns:
        str: The result or debugging output from the code execution.
    """
    import json
    # Step 1: Read the code and identify its language
    code, language = read_and_identify_code(file_name)
    if language is None:
        return code  # Error message

    # Step 2: Start a container for the identified language
    container_id = start_code_execution_container(language)
    if "Error" in container_id:
        return container_id  # Error starting container

    # Step 3: Gather project files and install dependencies (if any)
    project_files = gather_project_files(project_directory)
    if isinstance(project_files, str) and "Error" in project_files:
        return project_files  # Error gathering files

    if project_files:  # If there are dependencies to install
        project_files_json = json.dumps(project_files)
        install_result = install_dependencies(container_id, language, project_files_json)
        if "Error" in install_result:
            return install_result  # Error installing dependencies

    # Step 4: Execute the code in the container
    exec_result = execute_code_in_container(container_id, code, language)
    if "Error" in exec_result:
        logs = capture_container_logs(container_id)
        return f"Execution failed. Debug logs:\n{logs}"
    
    return exec_result  # Return the successful result of code execution
