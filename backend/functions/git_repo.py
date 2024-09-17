from memgpt.agent import Agent

def create_git_repo(self: Agent, folder_name: str):
    """
    Creates a new folder inside the base directory, initializes a Git repository, and creates 
    initial files such as README.md and .gitignore in the newly created folder.

    Args:
        folder_name (str): The name of the folder to be created, which will house the Git repository.

    Steps:
        1. Defines the base directory where the new folder will be created.
        2. Constructs the full path by combining the base directory with the folder name.
        3. Creates the folder (if it doesn't already exist).
        4. Changes the current working directory to the newly created folder.
        5. Initializes a Git repository in the folder and creates an initial README.md and .gitignore file.

    Raises:
        Exception: If an error occurs during folder creation, changing directories, or running Git commands.
    """
    import os
    import subprocess
    try:
        # Step 1: Define the base directory where the folder will be created
        base_dir = r"C:\Users\alfie\REPOS"
        
        # Step 2: Construct the full path to the new folder
        full_path = os.path.join(base_dir, folder_name)
        
        # Step 3: Create the new folder inside the base directory
        os.makedirs(full_path, exist_ok=True)
        print(f"Folder '{full_path}' created successfully.")
        
        # Step 4: Change the current working directory to the new folder
        os.chdir(full_path)
        print(f"Moved into folder '{full_path}'.")
        
        # Step 5: Check if git is installed and available
        git_check = subprocess.run(["git", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Git version: {git_check.stdout.decode().strip()}")

        # Initialize a git repository in the new folder
        subprocess.run(["git", "init"], check=True)
        print("Git repository initialized.")
        gitignore_content = """
        # Python specific .gitignore file
        */.env
        .venv
        __pycache__
        output.mp3
        """
        # Create README.md and .gitignore files using Python's file handling
        with open("README.md", "w") as readme_file:
            readme_file.write(f"# {folder_name}\n")
        # Write the .gitignore file
        with open(".gitignore", "w") as gitignore_file:
            gitignore_file.write(gitignore_content)
        #print(".gitignore created")
        
        print("README.md and .gitignore created successfully.")
        
        # Stage the files
        subprocess.run(["git", "add", "."], check=True)

        # Commit the changes
        subprocess.run(["git", "commit", "-m", "Initial commit"], check=True)

        print("Initial commit created.")

    except subprocess.CalledProcessError as e:
        print(f"Git error occurred: {e}")
    except OSError as e:
        print(f"OS error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Example usage:
# create_git_repo("my_new_project")
