// types.ts

export interface Message {
    role: 'user' | 'ai';
    content: string;
    type?: 'thought' | 'log' | 'function_call'; // Optional 'type' field for thoughts or logs
    timestamp: string;         // Time of the message
    name: string;              // Name of the sender
    icon?: string;             // Optional icon for the message
  }
