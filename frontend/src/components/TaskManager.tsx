import React, { useState, useEffect } from 'react';
import { Box, Spinner, Text, Input, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState<string>('');
  const [error, setError] = useState<string | null>(null); // Allow both null and string
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch tasks from backend
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks", {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []); // Ensure tasks is an array
          setError(null); // Clear any previous errors
        } else if (response.status === 401 || response.status === 403) {
          setError('Unauthorized or Forbidden. Redirecting to login.');
          // Optionally, redirect to login after a short delay
          setTimeout(() => {
            navigate('/login');
          }, 2000); // 2-second delay for user to read the message
        } else {
          setError('Error fetching tasks');
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setError('Error fetching tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [navigate]);

  // Function to handle adding a task
  const addTask = async () => {
    if (!newTask.trim()) {
      setError('Task cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/tasks/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Removed Authorization header
        },
        body: JSON.stringify({ task: newTask }),
        credentials: 'include', // Include cookies in the request
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []); // Update task list in the UI
        setNewTask(''); // Clear the input
        setError(null); // Clear any previous errors
      } else if (response.status === 401 || response.status === 403) {
        setError('Unauthorized or Forbidden. Redirecting to login.');
        // Optionally, redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000); // 2-second delay for user to read the message
      } else {
        setError('Error adding task');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Error adding task');
    }
  };

  return (
    <Box bg="gray.700" p={4} borderRadius="md" maxW="600px" mx="auto" mt={8}>
      <Text fontWeight="bold" color="white" fontSize="xl" mb={4}>
        Task List
      </Text>
      
      {error && (
        <Text color="red.400" mb={4}>
          {error}
        </Text>
      )} {/* Display error */}

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          {tasks.length > 0 ? (
            <VStack align="start" spacing={2} mb={4}>
              {tasks.map((task, index) => (
                <Text key={index} color="white">
                  • {task}
                </Text>
              ))}
            </VStack>
          ) : (
            <Text color="gray.400" mb={4}>
              No tasks available
            </Text>
          )}
        </>
      )}

      <Box mt={4}>
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task"
          bg="gray.600"
          color="white"
          mb={2}
          _placeholder={{ color: 'gray.400' }}
        />
        <Button onClick={addTask} colorScheme="blue" width="full">
          Add Task
        </Button>
      </Box>
    </Box>
  );
};

export default TaskManager;
