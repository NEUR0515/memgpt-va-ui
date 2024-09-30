import React, { useEffect, useState } from 'react';
import { Box, Spinner, Text } from '@chakra-ui/react';

const CalendarSection: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Remove token retrieval from localStorage
        // const token = localStorage.getItem('token');

        // Remove the Authorization header and include credentials
        const response = await fetch('/api/calendar-events', {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        } else if (response.status === 401 || response.status === 403) {
          console.error('Unauthorized or Forbidden. Please check your authentication.');
        } else {
          console.error('Error fetching calendar events:', response.status);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const formatEventDate = (event: any) => {
    const eventDate = event.start.dateTime || event.start.date;
    return eventDate
      ? new Date(eventDate).toLocaleString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Date not available';
  };

  return (
    <Box bg="gray.700" p={4} borderRadius="md">
      <Text fontWeight="bold" color="white">Schedule</Text>
      {loading ? (
        <Spinner />
      ) : (
        events.length ? (
          events.map((event, index) => (
            <Text key={index} color="white">
              {event.summary} - {formatEventDate(event)}
            </Text>
          ))
        ) : (
          <Text color="gray.400">No upcoming events</Text>
        )
      )}
    </Box>
  );
};

export default CalendarSection;
