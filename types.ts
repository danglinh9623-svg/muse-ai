export enum ModelType {
  DEEP_CREATIVE = 'gemini-3-pro-preview', // High Quality (Gemini 3 Pro)
  FAST_DRAFT = 'gemini-3-flash-preview', // Newest Fast Model (Gemini 3 Flash)
  QUOTA_SAVER = 'gemini-flash-latest', // Stable Flash (Likely 2.5), good for fallback
  LITE_SPEED = 'gemini-flash-lite-latest' // Flash Lite, lowest latency/cost
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