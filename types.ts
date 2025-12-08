export enum AppStep {
  ONBOARDING = 'ONBOARDING',
  INPUT_SELECTION = 'INPUT_SELECTION',
  PROCESSING = 'PROCESSING',
  GAME = 'GAME',
  SUCCESS = 'SUCCESS',
}

export interface User {
  name: string;
  avatar?: string; // filename or URL under /avatars/
}

export interface WordPair {
  id: string;
  english: string;
  hebrew: string;
  successCount: number; // 0 to 3
  lastPlayedTurn?: number; // Turn number when this word was last asked
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