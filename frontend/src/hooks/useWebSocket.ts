import { useEffect, useState } from 'react';

/**
 * A custom React hook for managing WebSocket connections.
 * @param {string} url - The WebSocket server URL to connect to.
 /**
  * Sets up a WebSocket connection and manages its lifecycle
  * @param {string} url - The WebSocket server URL to connect to
  * @param {function} onMessage - Callback function to handle incoming messages
  * @param {function} setSocket - State setter function to update the socket reference
  * @returns {function} Cleanup function to close the WebSocket connection
  */
 * @param {function} onMessage - Callback function to handle incoming messages.
 * @returns {Object} An object containing the sendMessage function.
 */
export const useWebSocket = (url: string, onMessage: (data: any) => void) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
```
/**
 * Handles the WebSocket open event.
 * @param {Event} event - The open event object (not explicitly used in this function).
 * @returns {void} This function doesn't return a value.
 */
```

  useEffect(() => {
    // Open WebSocket connection when the component mounts
    const ws = new WebSocket(url);
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket connection opened.");
    };

    /**
     /**
      * Handles the WebSocket close event
      * @param {Event} event - The close event object (not explicitly used in this function)
      * @returns {void} This function doesn't return a value
      */
     * Handles incoming WebSocket messages
     * @param {MessageEvent} event - The WebSocket message event
     * @returns {void} This function does not return a value
     */
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);
        /**
         * Sends a message through a WebSocket connection if it's open.
         * @param {any} message - The message to be sent through the WebSocket.
         * @returns {void} This function doesn't return a value.
         */
        onMessage(data);
      /**
       * Handles WebSocket error events.
       * @param {Event} error - The error event object containing details about the WebSocket error.
       * @returns {void} This method does not return a value.
       */
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
