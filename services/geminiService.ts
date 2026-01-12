import { GoogleGenAI } from "@google/genai";
import { WRITER_SYSTEM_INSTRUCTION } from "../constants";
import { ModelType } from "../types";

// Validate API Key immediately
const apiKey = process.env.API_KEY || "";
if (!apiKey) {
  console.error("CRITICAL: API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export const generateStoryContentStream = async (
  modelType: ModelType,
  history: { role: string; content: string }[],
  lastUserMessage: string
) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your Vercel settings.");
  }

  try {
    const chat = ai.chats.create({
      model: modelType,
      config: {
        systemInstruction: WRITER_SYSTEM_INSTRUCTION,
        temperature: 0.9, 
        topP: 0.95,
        topK: 64,
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
    
    // Check for specific error types to give better feedback
    if (error.message?.includes('404') || error.message?.includes('not found')) {
       throw new Error(`The model ${modelType} is currently unavailable. Please switch to a different model in the dropdown.`);
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
      model: 'gemini-1.5-flash', // Explicitly use 1.5 flash for utilities
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
    console.warn("Title generation failed.", e);
    return null;
  }
};