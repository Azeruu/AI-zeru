// Types for the AI-zeru chat application

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
}

export type ChatStatus = 'idle' | 'streaming' | 'error';
