import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { WRITER_SYSTEM_INSTRUCTION } from "../constants";
import { ModelType } from "../types";

// Initialize the client
// process.env.API_KEY is handled by Vite via define in vite.config.ts
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

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
        temperature: 0.9, // Higher creativity
        topP: 0.95,
        topK: 64,
        // Removed maxOutputTokens: 8192 to allow Gemini 3 models to manage their own budget
        // or prevent conflicts with thinking models without a defined budget.
        safetySettings: safetySettings,
        tools: [{ googleSearch: {} }], // Enable grounding for fandom research
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
      model: ModelType.DEEP_CREATIVE, // Always use Pro for character work
      contents: `
        ${instructions}
        
        Here is the current character data:
        ${currentProfileData}
        
        Return the result in a clean, structured JSON format with keys matching the profile fields, plus a 'suggestions' field for extra ideas.
      `,
      config: {
        responseMimeType: "application/json",
        safetySettings: safetySettings,
      }
    });
    
    return response.text || "{}";
  } catch (error) {
    console.error("Character Gen Error:", error);
    throw error;
  }
};

export const generateChatTitle = async (firstUserMessage: string, firstAiMessage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: ModelType.FAST_DRAFT, // Use Flash for speed
      contents: `Read the following story opening and generate a short, evocative title (max 6 words). Do not use quotes or prefixes like "Title:". Just the title.
      
      User Input: ${firstUserMessage.slice(0, 500)}
      AI Response: ${firstAiMessage.slice(0, 500)}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 20,
        // Disable thinking for this short task to respect maxOutputTokens
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    
    let title = response.text?.trim() || "Untitled Story";
    // Remove quotes if the model added them
    title = title.replace(/^["']|["']$/g, '');
    return title;
  } catch (e) {
    return "Untitled Story";
  }
};