import { GoogleGenAI } from "@google/genai";
import { WRITER_SYSTEM_INSTRUCTION } from "../constants";
import { ModelType } from "../types";

// Helper to reliably get the key from Vite's replacement or import.meta
const getApiKey = () => {
  // Try the process.env replacement first (handled by vite.config.ts)
  const key = process.env.API_KEY;
  if (key && key.length > 0) return key;
  
  // Fallback check for Vite specific env (if user named it VITE_API_KEY)
  if (import.meta.env && import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  
  return "";
};

const apiKey = getApiKey();

// Initialize casually, but validate strictly inside functions
const ai = new GoogleGenAI({ apiKey });

export const generateStoryContentStream = async (
  modelType: ModelType,
  history: { role: string; content: string }[],
  lastUserMessage: string
) => {
  if (!apiKey) {
    throw new Error("System Error: API Key is missing. Please check your Vercel Project Settings > Environment Variables > API_KEY.");
  }

  try {
    const chat = ai.chats.create({
      model: modelType,
      config: {
        systemInstruction: WRITER_SYSTEM_INSTRUCTION,
        temperature: 0.9, 
        topP: 0.95,
        topK: 64,
        tools: [{ googleSearch: {} }],
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessageStream({
      message: lastUserMessage,
    });

    return result;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
       throw new Error(`The model ${modelType} is currently unavailable. Please switch to a different model.`);
    }
    if (error.message?.includes('400') || error.message?.includes('API key')) {
       throw new Error("Invalid API Request. Check your API Key.");
    }
    
    throw error;
  }
};

export const enhanceCharacterProfile = async (
  currentProfileData: string,
  instructions: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    const response = await ai.models.generateContent({
      model: ModelType.DEEP_CREATIVE, 
      contents: `
        ${instructions}
        
        Here is the current character data:
        ${currentProfileData}
        
        Return the result in a clean, structured JSON format with keys matching the profile fields, plus a 'suggestions' field for extra ideas.
      `,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return response.text || "{}";
  } catch (error) {
    console.error("Character Gen Error:", error);
    throw error;
  }
};

export const generateChatTitle = async (firstUserMessage: string, firstAiMessage: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Read the following story opening and generate a short, evocative title (max 6 words). Do not use quotes.
      
      User Input: ${firstUserMessage.slice(0, 300)}
      AI Response: ${firstAiMessage.slice(0, 300)}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 20,
      }
    });
    
    let title = response.text?.trim();
    if (title) {
       title = title.replace(/^["']|["']$/g, '');
       return title;
    }
    return null;
  } catch (e) {
    return null;
  }
};