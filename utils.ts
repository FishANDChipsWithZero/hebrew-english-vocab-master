// Levenshtein distance for fuzzy string matching
export const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export type AnswerQuality = 'exact' | 'close' | 'wrong';

// Small synonyms dictionary to handle common variants (Hebrew and English keys)
const SYNONYMS: Record<string, string[]> = {
  // English -> Hebrew
  'upset': ['עצוב', 'עצבני'],

  // Hebrew reciprocal entries
  'עצוב': ['עצבני', 'ממורמר', 'נעלב'],
  'עצבני': ['עצוב', 'כועס'],
  'שדה תעופה': ['נמל תעופה'],
  'נמל תעופה': ['שדה תעופה'],
  'בריכה': ['בריכת שחייה'],

  // Chat-related variants (Hebrew variants and common spellings)
  'chat': ['לשוחח', "לשוחח בצ'אט", 'לשוחח בצאט', "לצ'טט", 'לטקסט', "לדבר בצ'אט", 'להתכתב', 'להתכתב בצאט'],
  'לשוחח': ["לצ'טט", "לדבר בצ'אט", 'להתכתב', "לשוחח בצ'אט"],
  "לצ'טט": ['לשוחח', "לדבר בצ'אט", 'להתכתב'],
  // "Be crazy about" and common Hebrew equivalents
  'be crazy about': ['למות על', 'להשתגע על', 'משוגע על', 'מאוד אוהב', 'אוהב מאוד'],
  'למות על': ['להשתגע על', 'משוגע על', 'be crazy about', 'love'],
  'להשתגע על': ['למות על', 'משוגע על', 'be crazy about'],
  'מת על': ['למות על', 'להשתגע על', 'be crazy about', 'love'],
};

// Normalize Hebrew/English strings: trim, lowercase, remove punctuation, strip leading definite article
const normalize = (s: string) => {
  if (!s) return '';
  let t = s.trim().toLowerCase();
  // Remove any character that's not Hebrew letters, Latin letters, digits or spaces
  // This removes slashes, dashes, parentheses, quotes and other punctuation that
  // previously caused mismatches (e.g. "שדה תעופה" vs "נמל תעופה/").
  t = t.replace(/[^0-9a-zA-Z\u0590-\u05FF\s]/g, '');
  // Normalize multiple spaces
  t = t.replace(/\s+/g, ' ').trim();
  // Strip leading Hebrew definite article 'ה' when it's a separate prefix
  if (t.length > 2 && t[0] === 'ה') {
    t = t.slice(1);
  }
  // Strip common plural/suffix endings to broaden matches
  if (t.length > 3 && (t.endsWith('ים') || t.endsWith('ות'))) {
    t = t.slice(0, -2);
  } else if (t.length > 2 && (t.endsWith('ה'))) {
    t = t.slice(0, -1);
  }
  return t;
};

const expandWithSynonyms = (term: string) => {
  const key = normalize(term);
  const list = [key];
  const syn = SYNONYMS[key] || SYNONYMS[term] || SYNONYMS[term.toLowerCase()];
  if (syn && syn.length) list.push(...syn.map(normalize));
  return Array.from(new Set(list.map(normalize)));
};

export const checkAnswerQuality = (userAnswer: string, correctAnswer: string): AnswerQuality => {
  const cleanUser = normalize(userAnswer);
    const cleanCorrect = normalize(correctAnswer);

  if (!cleanUser) return 'wrong';

  // (debug logging removed)

  // 1. Exact match to the full string (2 points)
  if (cleanUser === cleanCorrect) return 'exact';

  // Split correct answer by common delimiters to handle synonyms/lists
  // Example: "כלב / כלבה" or "Sound, Noise" -> ["sound", "noise"]
    // Split the raw correctAnswer by common delimiters first, then normalize each piece.
    // We must split before normalizing because `normalize` removes punctuation (like '/')
    // which would prevent correctly separating multiple variants such as "נמל תעופה / שדה תעופה".
    const rawVariations = (correctAnswer || '').split(/[\/,,;\-]+/).map(s => s.trim()).filter(s => s.length > 0);

  // 2. Check against each variation
  for (const variationRaw of rawVariations) {
    const variation = normalize(variationRaw);
    // If user matches one of the synonyms exactly -> Full points
    if (cleanUser === variation) return 'exact';

    // Check known synonyms for this variation (pass raw so SYNONYMS[raw] can match)
    const expanded = expandWithSynonyms(variationRaw);
    if (expanded.includes(cleanUser)) return 'exact';

    // Fuzzy match logic
    const distance = getLevenshteinDistance(cleanUser, variation);
    // Allow ~20% error tolerance, minimum 1 char
    const allowedErrors = Math.max(1, Math.floor(variation.length * 0.2));

    if (distance <= allowedErrors) {
      // If very close to a valid synonym, treat as exact
      return 'exact';
    }

    // Reverse Containment: "User includes Correct" (e.g. User: "זה נשמע מעניין", Correct: "מעניין")
    // Only apply if the variation is substantial (>= 2 chars)
    if (variation.length >= 2 && cleanUser.includes(variation)) {
      return 'exact';
    }

    // Forward Containment: "Correct includes User" (e.g. User: "נשמע", Correct: "נשמע מעניין")
    // This implies partial answer
    if (cleanUser.length >= 2 && variation.includes(cleanUser)) {
      return 'exact';
    }

    // Also check if the user answer has known synonyms which should match this variation
    const userExpanded = expandWithSynonyms(cleanUser);
    if (userExpanded.includes(variation)) return 'exact';
  }

  // 3. Global Fuzzy / Partial Check
  const globalDistance = getLevenshteinDistance(cleanUser, cleanCorrect);
  const globalAllowedErrors = Math.max(2, Math.floor(cleanCorrect.length * 0.3));

  if (globalDistance <= globalAllowedErrors) {
    return 'close';
  }

  // 4. Wrong
  return 'wrong';
};

export const createConfetti = () => {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
  const confettiCount = 100;
  const container = document.body;

  for (let i = 0; i < confettiCount; i++) {
    const el = document.createElement('div');
    el.classList.add('confetti');
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${Math.random() * 2 + 3}s`; // 3-5s
    el.style.animationDelay = `${Math.random() * 2}s`;
    container.appendChild(el);

    // Cleanup
    setTimeout(() => {
      el.remove();
    }, 5000);
  }
};

// Simple synth sound generator
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;

export const playSound = (type: 'success' | 'error' | 'pop') => {
  if (!AudioContextClass) return;
  if (!audioCtx) audioCtx = new AudioContextClass();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'success') {
    // Nice high ding
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } else if (type === 'error') {
    // Low buzz
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'pop') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }
};

// --- Sharing Utilities using LZString for compression ---

export const encodeWordsData = (words: any[]): string => {
  // Minify to just e (english) and h (hebrew)
  const minified = words.map(w => ({ e: w.english, h: w.hebrew }));
  const json = JSON.stringify(minified);
  // Compress using LZString to make URL significantly shorter and valid
  return LZString.compressToEncodedURIComponent(json);
};

export const decodeWordsData = (encoded: string): any[] => {
  try {
    // Fix: Some social platforms replace + with space, so we revert that just in case
    // although LZString's encodedUriComponent uses -_.!~*'()
    const safeEncoded = encoded.replace(/ /g, '+');
    
    // Decompress
    const json = LZString.decompressFromEncodedURIComponent(safeEncoded);
    if (!json) return [];
    
    const minified = JSON.parse(json);
    return minified.map((item: any, index: number) => ({
      id: `shared-${Date.now()}-${index}`,
      english: item.e,
      hebrew: item.h,
      successCount: 0 // Reset progress for new student
    }));
  } catch (e) {
    console.error("Failed to decode shared data", e);
    return [];
  }
};