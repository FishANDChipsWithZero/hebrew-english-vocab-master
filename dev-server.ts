import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key loaded:', apiKey ? '✓ (length: ' + apiKey.length + ')' : '✗ NOT FOUND');

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey });

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

app.post('/gemini', async (req, res) => {
  try {
    const { type, content, authUser } = req.body;

    // Check authentication in dev mode (same as production)
    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Unauthorized - Please login' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (type === 'text') {
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
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
      
      res.json(JSON.parse(geminiResponse.text || '[]'));
    } else {
      res.status(400).json({ error: 'Invalid type' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dev API server running on http://localhost:${PORT}`);
});
