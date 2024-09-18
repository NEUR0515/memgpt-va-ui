import { useEffect, useState } from 'react';

export const useWebSocket = (url: string, onMessage: (data: any) => void) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Open WebSocket connection when the component mounts
    const ws = new WebSocket(url);
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket connection opened.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
      setSocket(null);  // Reset the socket when it's closed
    };

    // Cleanup: Close WebSocket when the component unmounts
    return () => {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    };
  }, [url, onMessage]);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open. Cannot send message.");
    }
  };

  return { sendMessage };
};
