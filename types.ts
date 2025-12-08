export enum AppStep {
  ONBOARDING = 'ONBOARDING',
  INPUT_SELECTION = 'INPUT_SELECTION',
  PROCESSING = 'PROCESSING',
  GAME = 'GAME',
  SUCCESS = 'SUCCESS',
  PAST_TENSE_LEARN = 'PAST_TENSE_LEARN',
}

export interface User {
  name: string;
  avatar?: string; // filename or URL under /avatars/
  gender?: 'male' | 'female' | 'other';
}

export interface WordPair {
  id: string;
  english: string;
  hebrew: string;
  successCount: number; // 0 to 3
  lastPlayedTurn?: number; // Turn number when this word was last asked
  options?: string[]; // Multiple choice options (if present, this is a multiple choice question)
  correctIndex?: number; // Index of the correct answer in options array
  explanation?: string; // Explanation for the correct answer
}

export interface GameState {
  totalWords: number;
  currentScore: number;
  targetScore: number;
}

// Global definition for LZString library loaded via CDN
declare global {
  var LZString: {
    compressToEncodedURIComponent: (input: string) => string;
    decompressFromEncodedURIComponent: (input: string) => string;
  };
}