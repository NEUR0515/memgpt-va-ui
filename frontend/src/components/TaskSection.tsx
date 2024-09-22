import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

interface TaskSectionProps {
  tasks: string[];
}

const TaskSection: React.FC<TaskSectionProps> = ({ tasks }) => {
  return (
    <Box bg="gray.600" p={4} borderRadius="md" width="100%">
      <Text fontSize="xl" fontWeight="bold" color="white">Tasks</Text>
      <VStack mt={2} spacing={2} align="flex-start">
        {tasks.length ? tasks.map((task, idx) => (
          <Text key={idx} color="white">{task}</Text>
        )) : <Text color="gray.300">No tasks found</Text>}
      </VStack>
    </Box>
  );
};

export default TaskSection;
