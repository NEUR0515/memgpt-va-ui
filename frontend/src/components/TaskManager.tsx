import React, { useState, useEffect } from 'react';
import { Box, Spinner, Text, Input, Button, VStack } from '@chakra-ui/react';

/**
 * TaskManager component for managing and displaying tasks
 * @returns {React.ReactElement} A React component that renders a task management interface
 */
const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState<string>('');
  const [error, setError] = useState<string | null>(null);  // Allow both null and string
  /**
   * Asynchronously fetches tasks from the API using the token stored in localStorage.
   * @returns {Promise<void>} Does not return a value, but updates state with fetched tasks or error messages.
   */
  const [loading, setLoading] = useState(true);

  // Fetch tasks from backend
  useEffect(() => {
    async function fetchTasks() {
      const token = localStorage.getItem('token');  // Get token from localStorage
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/tasks", {
          headers: {
            'Authorization': `Bearer ${token}`  // Pass the token in the headers
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);  // Ensure tasks is an array
        } else if (response.status === 401 || response.status === 403) {
          setError('Unauthorized or Forbidden. Please check your token.');
        } else {
          setError('Error fetching tasks');
        }
      } catch (error) {
        setError('Error fetching tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  // Function to handle adding a task
  const addTask = async () => {
    if (!newTask.trim()) {
      setError('Task cannot be empty');
      return;
    }

    const token = localStorage.getItem('token');  // Get token from localStorage
    if (!token) {
      setError('No token found');
      return;
    }

    try {
      const response = await fetch('/api/tasks/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // Pass the token in the headers
        },
        body: JSON.stringify({ task: newTask })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);  // Update task list in the UI
        setNewTask('');  // Clear the input
      } else {
        setError('Error adding task');
      }
    } catch (error) {
      setError('Error adding task');
    }
  };

  return (
    <Box bg="gray.700" p={4} borderRadius="md">
      <Text fontWeight="bold" color="white">Task List</Text>
      
      {error && <Text color="red.400" mb={4}>{error}</Text>}  {/* Display error */}

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tasks.length > 0 ? (
            <VStack align="start" spacing={2}>
              /**
               * Renders a list of tasks as bullet points
               * @param {Array} tasks - An array of task strings to be displayed
               * @returns {Array<JSX.Element>} An array of Text components, each representing a task
               */
              {tasks.map((task, index) => (
                <Text key={index} color="white">• {task}</Text>
              ))}
            </VStack>
          ) : (
            <Text color="gray.400">No tasks available</Text>
          )}
        </>
      )}

      <Box mt={4}>
        <Input
          value={newTask}
          /**
           * Event handler for input change that updates the new task state
           * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
           * @returns {void} This function doesn't return a value
           */
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task"
          bg="gray.600"
          color="white"
          mb={2}
        />
        <Button onClick={addTask} colorScheme="blue">
          Add Task
        </Button>
      </Box>
    </Box>
  );
};

export default TaskManager;
