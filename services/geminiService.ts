
import { GoogleGenAI, Type } from "@google/genai";
import { FullAnalysis, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a world-class Chess Grandmaster and Coach. Your knowledge base includes deep study of classic and modern chess literature, including:
- "My System" by Aron Nimzowitsch
- "Zurich International Chess Tournament 1953" by David Bronstein
- "Dvoretsky's Endgame Manual" by Mark Dvoretsky
- "The Life and Games of Mikhail Tal" by Mikhail Tal
- "Bobby Fischer Teaches Chess"
- "Fundamental Chess Endings" by Karsten Müller

Your task is to analyze chess games and answer questions.
When analyzing: Evaluate Opening, Middlegame, Tactics, and Endgame.
When chatting: Provide concise, expert advice. Refer to the current game state (PGN/FEN) and any provided analysis.
Mention relevant books where applicable.
`;

export const analyzeGame = async (pgn: string): Promise<FullAnalysis> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Please analyze this chess game: ${pgn}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          opening: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              errors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'feedback', 'errors']
          },
          middlegame: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              errors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'feedback', 'errors']
          },
          tactics: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              errors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'feedback', 'errors']
          },
          endgame: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              errors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'feedback', 'errors']
          },
          overallAdvice: { type: Type.STRING },
          referencedBooks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['opening', 'middlegame', 'tactics', 'endgame', 'overallAdvice', 'referencedBooks']
      }
    }
  });

  try {
    return JSON.parse(response.text) as FullAnalysis;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Invalid analysis format received from AI.");
  }
};

export const chatWithAssistant = async (
  query: string, 
  pgn: string, 
  currentFen: string, 
  previousMessages: ChatMessage[],
  analysisContext?: FullAnalysis
): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + `\nContext:
      Current Game PGN: ${pgn}
      Current Position FEN: ${currentFen}
      ${analysisContext ? `AI Analysis Score Summary: ${analysisContext.opening.score}/${analysisContext.middlegame.score}/${analysisContext.tactics.score}/${analysisContext.endgame.score}` : ''}`,
    },
  });

  // Convert history to compatible format if needed, but for simplicity we send current query
  // Gemini chat expects messages, we can build the history string
  const historyPrompt = previousMessages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n');
  const finalPrompt = `${historyPrompt}\nHuman: ${query}`;
  
  const result = await chat.sendMessage({ message: finalPrompt });
  return result.text || "I apologize, I couldn't formulate a response.";
};
