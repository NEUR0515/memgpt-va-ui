# tools.py

from memgpt import create_client
from functions.send_sms import send_text_message
from functions.gsearch import google_search
from functions.schedule_event import schedule_event
from functions.list_upcoming_events import list_upcoming_events
from functions.git_repo import create_git_repo
from functions.file_functions import read_file, write_file
from functions.website_crawler import analyse_website
from functions.query_smart_home import query_home_assistant
from functions.control_smart_home import control_home_assistant_device
from functions.docker_functions import stop_docker_container, get_container_logs
from functions.coding_functions import read_and_identify_code, start_code_execution_container, install_dependencies_wrapper, execute_code_in_container, capture_logs, handle_code_execution
# Initialize the client
client = create_client()

# Create tools
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
stop_docker_container_tool = client.create_tool(stop_docker_container, name="stop_docker_container")
get_container_logs_tool = client.create_tool(get_container_logs, name="get_container_logs")
read_and_identify_code_tool = client.create_tool(read_and_identify_code, name="read_and_identify_code")
start_code_execution_container_tool = client.create_tool(start_code_execution_container, name="start_code_execution_container")
install_dependencies_tool = client.create_tool(install_dependencies_wrapper, name="install_dependencies_wrapper")
execute_code_in_container_tool = client.create_tool(execute_code_in_container, name="execute_code_in_container")
capture_logs_tool = client.create_tool(capture_logs, name="capture_logs")
handle_code_execution_tool  = client.create_tool(handle_code_execution, name="handle_code_execution")

# Export the tools
all_tools = [
    write_file_tool, read_file_tool, sms_tool, search_tool,
    schedule_event_tool, list_upcoming_events_tool,
    create_repo_tool, analyse_website_tool, query_home_assistant_tool,
    control_home_assistant_tool, read_and_identify_code_tool, start_code_execution_container_tool,
    stop_docker_container_tool, get_container_logs_tool,
    install_dependencies_tool, execute_code_in_container_tool, capture_logs_tool, handle_code_execution_tool
]
