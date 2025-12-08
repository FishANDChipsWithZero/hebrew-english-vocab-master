import { WordPair } from "../types";

// Client-side service now communicates with the Vercel Serverless Function
// This keeps the API Key secure on the server.

export const extractWordsFromText = async (text: string): Promise<WordPair[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', content: text }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.map((item: any, index: number) => ({
      id: `word-${Date.now()}-${index}`,
      english: item.english,
      hebrew: item.hebrew,
      successCount: 0,
    }));
  } catch (error) {
    console.error("Error extracting words from text:", error);
    throw new Error("Failed to extract words. Please check your network connection.");
  }
};

// Load preset band JSON from public/bands without calling external APIs
export const loadPresetBand = async (bandFileName: string): Promise<WordPair[]> => {
  try {
    const res = await fetch(`/bands/${bandFileName}`);
    if (!res.ok) {
      throw new Error(`Failed to load band: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    return data.map((item: any, index: number) => ({
      id: item.id || `band-${Date.now()}-${index}`,
      english: item.english || item.en || '',
      hebrew: item.hebrew || item.he || '',
      successCount: typeof item.successCount === 'number' ? item.successCount : 0,
    }));
  } catch (error) {
    console.error('Error loading preset band:', error);
    throw error;
  }
};

export const extractWordsFromImage = async (base64Image: string): Promise<WordPair[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'image', content: base64Image }),
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((item: any, index: number) => ({
      id: `img-word-${Date.now()}-${index}`,
      english: item.english,
      hebrew: item.hebrew,
      successCount: 0,
    }));
  } catch (error) {
    console.error("Error extracting words from image:", error);
    throw new Error("Failed to process image. Ensure it's clear and contains text.");
  }
};

export const translateSentence = async (sentence: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'translate', content: sentence }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
    const data = await response.json();
    return (data && data.translation) ? data.translation : '';
  } catch (err) {
    console.error('Translation error:', err);
    throw err;
  }
};