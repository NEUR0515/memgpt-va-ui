import React, { useState, useEffect } from 'react';

const TaskSection = () => {
  // Explicitly type tasks as an array of strings
  const [tasks, setTasks] = useState<string[]>([]); 
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState<string>("");

  // Fetch tasks from the backend
  useEffect(() => {
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
        {tasks.map((task, index) => (
          <li key={index}>{task}</li>
        ))}
      </ul>
    </div>
  );
};

export default TaskSection;
