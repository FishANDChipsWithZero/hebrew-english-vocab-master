import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client server-side
// The API key is securely loaded from Vercel Environment Variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      english: {
        type: Type.STRING,
        description: "The word or phrase in English. IMPORTANT: Keep any part-of-speech tags like (n), (v), [adj] exactly as they appear.",
      },
      hebrew: {
        type: Type.STRING,
        description: "The Hebrew translation. If there are multiple synonyms, separate them with ' / '.",
      },
    },
    required: ["english", "hebrew"],
  },
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, content } = request.body;

    if (!content) {
      return response.status(400).json({ error: 'Content is required' });
    }

    let resultData;

    if (type === 'text') {
      const geminiResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Extract a list of English vocabulary words and their Hebrew translations from the following text.
        
        RULES:
        1. If the English word has a part-of-speech tag (like "run (v)" or "blue (adj)"), MUST include it in the 'english' field. Do not remove it.
        2. If there are multiple Hebrew translations, separate them with " / ".
        3. Ignore irrelevant conversational text, just get the vocabulary.
        
        Text to analyze:
        ${content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      resultData = JSON.parse(geminiResponse.text || "[]");

    } else if (type === 'image') {
      // Clean base64 if needed, though client usually sends clean or full data url.
      const cleanBase64 = content.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

      const geminiResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this image and extract English-Hebrew vocabulary pairs.
              
              RULES:
              1. Keep part-of-speech tags (e.g., 'word (n)', 'word [v]') in the 'english' output. DO NOT CLEAN THEM.
              2. If a word has multiple meanings in the image, separate Hebrew translations with ' / '.
              3. Return a raw JSON list.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      resultData = JSON.parse(geminiResponse.text || "[]");
    } else {
      return response.status(400).json({ error: 'Invalid type' });
    }

    return response.status(200).json(resultData);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return response.status(500).json({ error: 'Failed to process request on server' });
  }
}