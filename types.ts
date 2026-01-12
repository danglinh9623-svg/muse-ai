export enum ModelType {
  DEEP_CREATIVE = 'gemini-1.5-pro', // Best Quality Stable Model (High Context, Nuance)
  FAST_DRAFT = 'gemini-1.5-flash', // Fast & Efficient
  QUOTA_SAVER = 'gemini-1.5-flash-8b', // Ultra low cost/latency
  LITE_SPEED = 'gemini-1.5-flash' // Fallback
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
  modelUsed: ModelType;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  age: string;
  appearance: string;
  personality: string;
  backstory: string;
  goals: string;
  weaknesses: string;
  relationships: string;
  notes: string;
}

export enum AppView {
  CHAT = 'CHAT',
  CHARACTERS = 'CHARACTERS',
  SETTINGS = 'SETTINGS', 
}