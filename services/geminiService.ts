import { GoogleGenAI } from "@google/genai";
import { WRITER_SYSTEM_INSTRUCTION } from "../constants";
import { ModelType } from "../types";

// Initialize the client safely. 
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// REMOVED: Custom Safety Settings (BLOCK_NONE) as they often cause 400 Bad Request errors 
// on free tier keys or specific regions. We will use the default safety settings.

export const generateStoryContentStream = async (
  modelType: ModelType,
  history: { role: string; content: string }[],
  lastUserMessage: string
) => {
  try {
    const chat = ai.chats.create({
      model: modelType,
      config: {
        systemInstruction: WRITER_SYSTEM_INSTRUCTION,
        temperature: 0.9, 
        topP: 0.95,
        topK: 64,
        // Removed explicit safetySettings to use defaults (more stable)
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

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const enhanceCharacterProfile = async (
  currentProfileData: string,
  instructions: string
): Promise<string> => {
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
        // Removed explicit safetySettings
      }
    });
    
    return response.text || "{}";
  } catch (error) {
    console.error("Character Gen Error:", error);
    throw error;
  }
};

export const generateChatTitle = async (firstUserMessage: string, firstAiMessage: string): Promise<string | null> => {
  try {
    // Use 'gemini-flash-latest' (1.5 Flash) for title generation. 
    // It is extremely stable, fast, and unlikely to error out on config.
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest', 
      contents: `Read the following story opening and generate a short, evocative title (max 6 words). Do not use quotes or prefixes like "Title:". Just the title.
      
      User Input: ${firstUserMessage.slice(0, 300)}
      AI Response: ${firstAiMessage.slice(0, 300)}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 20,
        // Removed thinkingConfig as it is not supported on 1.5 Flash
      }
    });
    
    let title = response.text?.trim();
    if (title) {
       title = title.replace(/^["']|["']$/g, '');
       return title;
    }
    return null;
  } catch (e) {
    console.warn("Title generation failed, falling back to default.", e);
    return null;
  }
};