import React, { useState, useEffect } from 'react';

/**
 * Renders a task section component that displays a list of tasks and provides functionality to add new tasks.
 * @returns {JSX.Element} A React component that shows a list of tasks or loading/empty state messages.
 */
const TaskSection = () => {
  // Explicitly type tasks as an array of strings
  const [tasks, setTasks] = useState<string[]>([]); 
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState<string>("");

  // Fetch tasks from the backend
  useEffect(() => {
    /**
     * Fetches tasks from the API and updates the component state
     * @returns {Promise<void>} A promise that resolves when the tasks are fetched and state is updated
     */
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        setTasks(data.tasks || []); // Ensure tasks is an array
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    };
```
/**
 * Handles the addition of a new task by sending a POST request to the server and updating the UI.
 * @param {void} - This function doesn't take any parameters.
 * @returns {Promise<void>} A promise that resolves when the task is added successfully or rejects if there's an error.
 */
```
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_description: newTask }),
      });
      const data = await response.json();
      console.log(data.message); // Log success message
      setTasks([...tasks, newTask]); // Update task list in UI
      setNewTask(""); // Clear the input
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return <div>No tasks available</div>;
  }

  return (
    <div>
      <h2>Tasks</h2>
      <ul>
        ```
        /**
         * Renders a list of tasks using map function
         * @param {Array} tasks - An array of task items to be displayed
         * @returns {Array} An array of list item elements, each containing a task
         */
        
        ```        {tasks.map((task, index) => (
          <li key={index}>{task}</li>
        ))}
      </ul>
    </div>
  );
};

export default TaskSection;
