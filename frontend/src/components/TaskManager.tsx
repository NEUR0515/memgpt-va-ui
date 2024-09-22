import React, { useState, useEffect } from 'react';
import { Box, Spinner, Text, Input, Button, VStack } from '@chakra-ui/react';

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState<string>('');
  const [error, setError] = useState<string | null>(null);  // Allow both null and string
  const [loading, setLoading] = useState(true);

  // Fetch tasks from backend
  useEffect(() => {
    fetch("/api/tasks")
      .then(res => res.json())
      .then(data => {
        setTasks(data.tasks || []);  // Ensure tasks is an array
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching tasks');
        setLoading(false);
      });
  }, []);

  // Function to handle adding a task
  const addTask = () => {
    if (!newTask.trim()) {
      setError('Task cannot be empty');
      return;
    }

    fetch('/api/tasks/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask })
    })
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))  // Update task list in the UI
      .catch(() => setError('Error adding task'));

    setNewTask('');  // Clear the input
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
