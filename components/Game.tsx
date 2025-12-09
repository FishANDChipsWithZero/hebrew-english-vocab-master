import React, { useState, useEffect, useRef } from 'react';
import BackButton from './BackButton';
import { WordPair, User } from '../types';
import { checkAnswerQuality, checkAnswerQualityStrict, createConfetti, AnswerQuality, playSound } from '../utils';
import { translateSentence } from '../services/geminiService';

interface GameProps {
  words: WordPair[];
  user: User;
  // optional preset filename to persist progress per band
  presetFilename?: string | null;
  onFinish: () => void;
  onBack: () => void;
  onBackToSettings?: () => void;
}

const REQUIRED_WINS = 3;
const SPACING_BUFFER = 2; 

interface FloatingPoint {
  id: number;
  value: number;
  x: number;
  y: number;
}

// Map short codes to full display names for Parts of Speech
const POS_MAP: Record<string, string> = {
  'n': 'NOUN',
  'noun': 'NOUN',
  'v': 'VERB',
  'verb': 'VERB',
  'adj': 'ADJECTIVE',
  'adjective': 'ADJECTIVE',
  'adv': 'ADVERB',
  'adverb': 'ADVERB',
  'prep': 'PREPOSITION',
  'conj': 'CONJUNCTION',
  'pron': 'PRONOUN',
  'phrasal': 'PHRASAL VERB',
  'expression': 'EXPRESSION'
};

const Game: React.FC<GameProps> = ({ words, user, presetFilename, onFinish, onBack, onBackToSettings }) => {
  // State
  const [activeWords, setActiveWords] = useState<WordPair[]>([]);
  const [currentWord, setCurrentWord] = useState<WordPair | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<AnswerQuality | 'none'>('none');
  const [showHint, setShowHint] = useState(false);
  const [hintTranslation, setHintTranslation] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);
  const [revealedTranslation, setRevealedTranslation] = useState<string | null>(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game Stats & Visuals
  const [turnCount, setTurnCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [animationKey, setAnimationKey] = useState(0); // To force re-render of card for animation
  
  // Visual Feedback State for Mastery Dots
  const [dotsFeedback, setDotsFeedback] = useState<'neutral' | 'success' | 'error'>('neutral');

  // Audio ref
  const synth = window.speechSynthesis;
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarPosClass, setAvatarPosClass] = useState<string>('avatar-pos-35');

  // Mode-aware session-scoped XP persistence: separate XP for words vs sentences
  const [modeType, setModeType] = useState<'words' | 'sentences'>('words');
  const loadedSessionRef = useRef<boolean>(false);

  const sessionKeyFor = (mode: 'words' | 'sentences') => `session_xp:${mode}`;

  const userId = (user?.name || 'anon').replace(/\s+/g, '_');
  const presetSessionKey = (preset?: string) => (preset ? `session_xp:${userId}:${preset}` : null);
  const userModeSessionKey = (mode: 'words' | 'sentences') => `session_xp:${userId}:${mode}`;


  // Initialize active words; if a presetFilename is provided, merge saved progress
  useEffect(() => {
    const initialise = () => {
      const incoming = words ? [...words] : [];
      if (!incoming || incoming.length === 0) {
        setActiveWords([]);
        setCurrentWord(null);
        return;
      }

      // Determine whether this batch is sentence-mode or word-mode
      const isSentenceBatch = incoming.some(w => (w.english || '').includes('_') || (w.id && String(w.id).startsWith('s')));
      setModeType(isSentenceBatch ? 'sentences' : 'words');

      // Try to merge saved progress when a preset filename is available
      let merged = incoming;
      try {
        if ((window as any).localStorage && (arguments.length || true)) {
          const key = presetFilename ? `progress:${userId}:${presetFilename}` : null;
          if (key) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const saved: Record<string, any> = JSON.parse(raw || '{}');
              merged = incoming.map(w => ({
                ...w,
                successCount: typeof (saved[w.id]?.successCount) === 'number' ? saved[w.id].successCount : (w.successCount || 0),
                lastPlayedTurn: typeof (saved[w.id]?.lastPlayedTurn) === 'number' ? saved[w.id].lastPlayedTurn : w.lastPlayedTurn,
              }));
            }
          }
        }
      } catch (e) {
        // ignore storage errors
      }

      setActiveWords(merged);
      // Load XP from localStorage (persists across sessions)
      try {
        // Use a single unified XP key per user to prevent confusion
          const xpKey = `xp:${userId}`;
          const raw = localStorage.getItem(xpKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.currentPoints === 'number') setCurrentPoints(parsed.currentPoints);
          if (typeof parsed.streak === 'number') setStreak(parsed.streak);
          if (typeof parsed.maxStreak === 'number') setMaxStreak(parsed.maxStreak);
        }
      } catch (e) {
        // ignore
      } finally {
        // mark that we've attempted to load session XP so the persist effect doesn't overwrite it immediately
        loadedSessionRef.current = true;
      }

      pickNextWord(merged, 0);
    };
    initialise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, presetFilename, userId]);

      // Persist XP to localStorage whenever it changes (survives browser close)
      useEffect(() => {
        try {
          if (!loadedSessionRef.current) return;
          const payload = { currentPoints, streak, maxStreak };
          // Use a single unified XP key per user
          const xpKey = `xp:${userId}`;
          localStorage.setItem(xpKey, JSON.stringify(payload));
        } catch (e) {
          // ignore storage failures
        }
      }, [currentPoints, streak, maxStreak, userId]);

  // Persist progress helper (per-preset in localStorage)
  const persistProgress = (list: WordPair[]) => {
    try {
      if (!presetFilename) return;
      const key = `progress:${userId}:${presetFilename}`;
      const map: Record<string, any> = {};
      list.forEach(w => {
        map[w.id] = { successCount: w.successCount || 0, lastPlayedTurn: w.lastPlayedTurn ?? null };
      });
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      // ignore storage failures
    }
  };

  // Load avatar metadata to allow per-avatar positioning classes
  useEffect(() => {
    if (!user?.avatar) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/avatars/index.json');
        if (!res.ok) return;
        const list: Array<{ filename: string; posClass?: string }> = await res.json();
        if (!mounted) return;
        const found = list.find(l => l.filename === user.avatar);
        if (found && found.posClass) setAvatarPosClass(found.posClass);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const pickNextWord = (pool: WordPair[], currentTurn: number) => {
    const incompleteWords = pool.filter(w => w.successCount < REQUIRED_WINS);
    
    if (incompleteWords.length === 0) {
      onFinish();
      return;
    }

    let candidates = incompleteWords;
    if (incompleteWords.length > SPACING_BUFFER) {
      candidates = incompleteWords.filter(w => {
        const lastTurn = w.lastPlayedTurn ?? -1;
        return (currentTurn - lastTurn) > SPACING_BUFFER;
      });
      if (candidates.length === 0) candidates = incompleteWords;
    }

    const randomWord = candidates[Math.floor(Math.random() * candidates.length)];
    
    setCurrentWord(randomWord);
    setUserAnswer('');
    setFeedback('none');
    setDotsFeedback('neutral');
    setShowHint(false);
    setHintTranslation(null);
    setRevealedAnswer(null);
    setRevealedTranslation(null);
    setAnimationKey(prev => prev + 1); // Trigger entrance animation
    
    // Focus input after short delay for animation
    setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
  };

  // Helper to extract word and POS
  // Function to render text (no special highlighting for blanks)
  const renderTextWithHighlightedBlanks = (text: string) => {
    return text;
  };

  const parseWordDisplay = (text: string) => {
    if (!text) return { word: text, pos: null };

    // Move any internal '(s)' or '(S)' markers to the end of the string
    let suffix = '';
    let cleaned = text.replace(/\(\s*([sS])\s*\)/g, (_m, p1) => {
      suffix = ` (${p1.toUpperCase()})`;
      return '';
    }).replace(/\s{2,}/g, ' ').trim();

    // Try to match standard "Word (pos)" or "Word [pos]" format at the end
    // Allow POS tags that include slashes (e.g. "adv/n") or commas/pipes
    const match = cleaned.match(/^(.*?)\s*[\(\[]([a-zA-Z\/\s,|]+)[\)\]]\s*$/);

    if (match) {
      const rawWord = match[1].trim();
      const tagRaw = match[2].toLowerCase().trim();

      // Support multiple POS tags like "adv/n" or "n/adj" by splitting and mapping each piece
      const pieces = tagRaw.split(/[\/|,]+/).map(p => p.trim()).filter(Boolean);
      if (pieces.length > 0) {
        const mapped = pieces.map(p => {
          if (POS_MAP[p]) return POS_MAP[p].toLowerCase();
          // If the piece already looks like a full POS word, use it
          const lowerVals = Object.values(POS_MAP).map(v => v.toLowerCase());
          if (lowerVals.includes(p)) return p;
          return p;
        });

        // Join with ' or ' for readability ("adverb or noun")
        const displayPos = mapped.join(' or ');
        return { word: rawWord + suffix, pos: displayPos };
      }
    }

    // Return cleaned string with suffix (if any) when no valid POS found
    return { word: (cleaned + suffix).trim(), pos: null };
  };

  const playAudio = () => {
    if (!currentWord) return;

    const { word, pos } = parseWordDisplay(currentWord.english);

    // Cancel any current speaking
    synth.cancel();

    // Speak main word (strip trailing parenthetical single-letter markers like (S) from speech)
    const speakWord = word.replace(/\s*\([A-Z]{1}\)\s*$/i, '').trim();

    // Helper to speak a string and return a Promise that resolves on end
    const speakOnce = (text: string, rate = 0.8, pitch = 1.0) => new Promise<void>(resolve => {
      if (!text || !text.trim()) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate;
      u.pitch = pitch;
      u.onend = () => { resolve(); };
      synth.speak(u);
    });

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // If there are blanks (underscore sequences), speak the sentence in parts and
    // when encountering a blank: pause silently for a short duration, then continue.
    if (/_{1,}/.test(speakWord)) {
      const parts = speakWord.split(/(_+)/);
      (async () => {
        for (const part of parts) {
          if (/^_+$/.test(part)) {
            // silent pause for a moment instead of speaking a placeholder
            await delay(600);
          } else {
            await speakOnce(part, 0.95, 1.0);
          }
        }

        if (pos) {
          const posForSpeech = pos.split(/\s+or\s+/i).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' or ');
          await delay(120);
          await speakOnce(posForSpeech, 0.85, 0.85);
        }
      })();
    } else {
      // No blanks: simple speak
      speakOnce(speakWord, 0.9, 1.0);
      if (pos) {
        const posForSpeech = pos.split(/\s+or\s+/i).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' or ');
        // speak POS after a small delay
        setTimeout(() => {
          const u2 = new SpeechSynthesisUtterance(posForSpeech);
          u2.lang = 'en-US';
          u2.rate = 0.85;
          u2.pitch = 0.8;
          synth.speak(u2);
        }, 350);
      }
    }
  };

  // Local heuristic phrase map used as a fallback when the server cannot translate.
  const localPhraseMap: [string, string][] = [
    ['has changed the way we communicate', 'שינתה את הדרך שבה אנו מתקשרים'],
    ['has changed the way we communicate.', 'שינתה את הדרך שבה אנו מתקשרים.'],
    ['modern', 'מודרני'],
    ['has changed', 'שינתה'],
    ['has changed.', 'שינתה.'],
    ['has', 'יש'],
    ['changed', 'שינה'],
    ['the way', 'את הדרך'],
    ['we communicate', 'אנו מתקשרים'],
    ['we', 'אנו'],
    ['communicate', 'מתקשרים'],
  ];

  const localTranslateSegment = (src: string) => {
    let out = src;
    // Replace longer phrases first
    for (const [eng, heb] of localPhraseMap) {
      const re = new RegExp(eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      out = out.replace(re, heb);
    }
    return out;
  };

  // Translate the full sentence to Hebrew while preserving underscores
  const translateMaskedPreservePlace = async (masked: string) => {
    // First, replace underscores with a placeholder that won't be translated
    const placeholder = '___BLANK___';
    const withPlaceholder = masked.replace(/_+/g, placeholder);
    
    try {
      // Translate the entire sentence
      const translated = await translateSentence(withPlaceholder);
      if (translated) {
        // Replace the placeholder back with underscores
        return translated.replace(new RegExp(placeholder, 'g'), '___');
      }
    } catch (e) {
      // Fallback to local translation
      const localTranslated = localTranslateSegment(withPlaceholder);
      return localTranslated.replace(new RegExp(placeholder, 'g'), '___');
    }

    // If all fails, return original with local translation attempt
    return localTranslateSegment(withPlaceholder).replace(new RegExp(placeholder, 'g'), '___');
  };

  const safePlaySound = (type: 'success' | 'error' | 'pop') => {
    if (!isMuted) {
      playSound(type);
    }
  };

  const addFloatingPoints = (val: number) => {
    const id = Date.now();
    // Randomize slightly around center
    const x = Math.random() * 40 - 20; 
    const y = Math.random() * 20 - 10;
    setFloatingPoints(prev => [...prev, { id, value: val, x, y }]);
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  // Share button removed for classroom-only version

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;

    // Use strict checking for Past Simple/Progressive exercises
    const isPastExercise = String(currentWord.id).startsWith('past_');
    const quality = isPastExercise 
      ? checkAnswerQualityStrict(userAnswer, currentWord.hebrew)
      : checkAnswerQuality(userAnswer, currentWord.hebrew);
    setFeedback(quality);

    const nextTurn = turnCount + 1;
    setTurnCount(nextTurn);

    // Update Word State
    const updatedWords = activeWords.map(w => {
      if (w.id === currentWord.id) {
        let newSuccessCount = w.successCount;
        if (quality === 'exact') {
          newSuccessCount += 1;
        }
        return { 
          ...w, 
          successCount: newSuccessCount,
          lastPlayedTurn: nextTurn 
        };
      }
      return w;
    });

    setActiveWords(updatedWords);
    // persist
    persistProgress(updatedWords);

    if (quality === 'exact') {
      safePlaySound('success');
      setDotsFeedback('success');
      const points = 10; // Fixed 10 points for correct answer
      setCurrentPoints(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > maxStreak) setMaxStreak(newStreak);
        return newStreak;
      });
      addFloatingPoints(points);
      createConfetti();

      // Immediately mark this word as known so it won't be asked again
      const immediatelyKnown = updatedWords.map(w => w.id === currentWord.id ? { ...w, successCount: REQUIRED_WINS, lastPlayedTurn: nextTurn } : w);
      setActiveWords(immediatelyKnown);
      persistProgress(immediatelyKnown);

      setTimeout(() => pickNextWord(immediatelyKnown, nextTurn), 800);
    } else if (quality === 'close') {
      safePlaySound('pop');
      setDotsFeedback('neutral'); // Close isn't a "strike" on the mastery dots usually
      setCurrentPoints(prev => prev + 10);
      setStreak(0); 
      addFloatingPoints(10);
      setTimeout(() => pickNextWord(updatedWords, nextTurn), 2500);
    } else {
      safePlaySound('error');
      setDotsFeedback('error');
      setStreak(0);

      // If this is a sentence-fill exercise, reveal correct answer and a translated sentence
      if (isSentenceMode && currentWord) {
        const correct = currentWord.hebrew;
        setRevealedAnswer(correct);
        setLoadingReveal(true);

        // Build filled sentence by replacing underscore sequences with the correct answer
        const filled = currentWord.english.replace(/_+/g, ` ${correct} `);

        (async () => {
          try {
            // Translate the filled sentence
            const t = await translateSentence(filled);
            setRevealedTranslation(t || '');
            
            // Also translate just the word if it's from a sentence bank
            // Check if the word is in English (not Hebrew) by checking if it contains Latin characters
            if (correct && /[a-zA-Z]/.test(correct)) {
              try {
                const wordTranslation = await translateSentence(correct);
                if (wordTranslation) {
                  setRevealedTranslation(`${wordTranslation} - ${t || ''}`);
                }
              } catch (e) {
                // Keep the sentence translation if word translation fails
              }
            }
          } catch (e) {
            setRevealedTranslation('לא ניתן לתרגם כרגע');
          } finally {
            setLoadingReveal(false);
            // Wait 3 seconds for the student to see the revealed filled sentence and translation, then continue
            setTimeout(() => {
              // Persist state and pick next
              persistProgress(updatedWords);
              pickNextWord(updatedWords, nextTurn);
            }, 3000);
          }
        })();
      } else {
        // non-sentence wrong answer: show the correct answer longer so student can see it - 6 seconds
        setTimeout(() => pickNextWord(updatedWords, nextTurn), 6000);
      }
    }
  };

  if (!currentWord) return <div className="text-center p-10 font-bold text-2xl animate-pulse text-yellow-400">טוען משחק...</div>;

  const wordsDone = activeWords.filter(w => w.successCount >= REQUIRED_WINS).length;
  const totalWords = activeWords.length;
  const progressPercentage = Math.round((wordsDone / totalWords) * 100);

  const parsedWord = parseWordDisplay(currentWord.english);

  // Detect whether the current word is a sentence-fill exercise.
  const isSentenceMode = Boolean(currentWord && (currentWord.english.includes('_') || (currentWord.id && String(currentWord.id).startsWith('s'))));

  // Detect if there are multiple blanks (past simple/progressive exercises)
  const hasMultipleBlanks = isSentenceMode && currentWord && (currentWord.english.match(/_+/g) || []).length > 1;
  
  // Detect if this is a Past Simple/Progressive exercise (requires strict checking)
  const isPastTenseExercise = currentWord && String(currentWord.id).startsWith('past_');

  // Build the sentence bank only when in sentence mode
  let sentenceBank: string[] = [];
  if (isSentenceMode && currentWord && currentWord.id && currentWord.id.includes('-')) {
    const prefix = currentWord.id.split('-')[0];
    sentenceBank = activeWords
      .filter(w => w.id.startsWith(prefix))
      .map(w => w.hebrew)
      .filter((v, i, a) => a.indexOf(v) === i); // unique
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-4">
      {/* Top Bar: User & Score */}
      <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg p-2 sm:p-3 mb-4 sm:mb-6 border border-slate-600 relative overflow-hidden neon-border">
        <div className="flex items-center gap-2 sm:gap-3 z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-xl sm:text-2xl shadow-inner flex-shrink-0 overflow-hidden">
            {user.avatar ? (
              <img src={`/avatars/${user.avatar}`} alt={`${user.name} avatar`} className={`avatar-img ${avatarPosClass}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold bg-slate-700">{(user.name || '').charAt(0).toUpperCase() || 'ת'}</div>
            )}
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-white text-lg truncate">{user.name}</div>
            <div className="text-sm font-black text-yellow-400 drop-shadow-[0_0_5px_rgba(219,193,112,0.8)]">
               XP: {currentPoints}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Two back buttons - one for settings, one for practice selection */}
          <div className="relative z-10">
            <BackButton onClick={() => {
              // Save progress before going back
              persistProgress(activeWords);
              onBackToSettings?.();
            }} small>
              הגדרות
            </BackButton>
          </div>
          <div className="relative z-10">
            <BackButton onClick={() => {
              // Save progress before going back
              persistProgress(activeWords);
              onBack?.();
            }} small>
              תרגולים
            </BackButton>
          </div>
            {/* Share button removed for classroom-only mode */}

            {/* Mute Toggle */}
            <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-full border transition-all ${
                    isMuted 
                    ? 'border-red-500 bg-red-900/20 text-red-400' 
                    : 'border-slate-500 bg-slate-700/50 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? "הפעל סאונד" : "השתק סאונד"}
            >
                {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Streak Indicator */}
            <div className={`flex flex-col items-center z-10 transition-transform ${streak > 1 ? 'scale-110' : 'scale-100'}`}>
            <div className="text-2xl font-black italic text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)] flex items-center gap-1">
                {streak > 0 ? '🔥' : '❄️'} {streak}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Streak</div>
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 relative mt-3">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1">
            <span>התקדמות</span>
            <span>{wordsDone} / {totalWords} מילים מוכרות</span>
          </div>
        <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.8)]"
            style={{ width: `${progressPercentage}%` }}
          >
              <div
                className="w-full h-full opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at center, rgba(14,116,144,0.25), rgba(15,23,42,0.0) 60%)',
                }}
              />
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      <div key={animationKey} className="relative animate-pop-in">
        <div className="bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-600 transform transition-transform hover:scale-[1.01] neon-border">
          
          {/* Card Header / Word Display */}
          <div className="bg-slate-900 p-4 md:p-6 text-center relative overflow-hidden min-h-[180px] flex flex-col justify-center items-center group">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900 via-slate-950 to-slate-950"></div>
            
            {/* Word - Adjusted with break-words and responsive text sizing */}
            <div className="w-full px-2 z-10">
              {sentenceBank.length > 0 && (
                <div className="mb-2 w-full">
                  <div className="text-sm sm:text-base md:text-lg font-black tracking-wide mb-1.5 sentence-bank-header text-yellow-300">מחסן מילים</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sentenceBank.map((w, idx) => (
                      <span key={idx} className="inline-block bg-slate-900/70 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">{w}</span>
                    ))}
                  </div>
                </div>
              )}
              <h2 className={`${isSentenceMode ? 'text-xl sm:text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] tracking-wide break-words whitespace-normal leading-tight mb-2 flex items-center justify-center gap-2`}>
                <span dir="ltr" className="text-left">
                  {isSentenceMode ? renderTextWithHighlightedBlanks(parsedWord.word) : parsedWord.word}
                </span>
                {currentWord && currentWord.successCount >= REQUIRED_WINS && (
                  <span className="inline-flex items-center gap-2 bg-green-700/20 border border-green-500 text-green-200 text-sm font-bold px-3 py-1 rounded-full">
                    ✅ <span>מוכר</span>
                  </span>
                )}
              </h2>
              {/* Distinct Part of Speech Badge */}
              {parsedWord.pos && (
                <div className="mb-2">
                  <span className="inline-block bg-yellow-900/50 border border-yellow-500 text-yellow-300 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(219,193,112,0.4)] neon-text-glow">
                    {parsedWord.pos}
                  </span>
                </div>
              )}
            </div>
            
            <button 
              onClick={playAudio}
              type="button"
              className="relative z-10 btn-3d bg-yellow-600 hover:bg-yellow-500 hover:shadow-yellow-500/50 text-slate-900 border-b-4 border-yellow-900 rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-all active:border-b-0 active:translate-y-1 shadow-lg shadow-yellow-900/50 hover:shadow-xl mt-1"
            >
              <span className="text-sm">🔊</span> שמע הגייה
            </button>

            {/* Neon Mastery Dots */}
            <div className="absolute top-4 right-4 flex gap-2 md:gap-3 bg-slate-950/80 p-2 md:p-3 rounded-full backdrop-blur-md border border-slate-700 shadow-xl">
               {[...Array(REQUIRED_WINS)].map((_, i) => {
                 const isCompleted = i < currentWord.successCount;
                 let dotColorClass = 'bg-slate-800 border-slate-600'; // Default Empty
                 
                 if (isCompleted) {
                   dotColorClass = 'bg-green-500 border-green-400 shadow-[0_0_10px_#22c55e]';
                 }

                 // Override for feedback animation: error -> red glow, success -> green glow
                 if (dotsFeedback === 'error') {
                   dotColorClass = 'bg-red-500/60 border-red-500 dot-glow-red animate-shake';
                 } else if (dotsFeedback === 'success') {
                   // Highlight the dot that was just completed with a strong glow
                   if (i === currentWord.successCount - 1) {
                     dotColorClass = 'bg-green-400 border-green-300 dot-glow-green scale-125 transition-transform';
                   } else if (isCompleted) {
                     // already-completed dots also get a gentle glow
                     dotColorClass = 'bg-green-500 border-green-400 dot-glow-green';
                   }
                 }

                 return (
                   <div 
                      key={i} 
                      className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 transition-all duration-300 ${dotColorClass}`}
                   />
                 );
               })}
            </div>
          </div>

          {/* Interaction Area */}
          <div className="p-4 md:p-6 bg-slate-800 relative">
            
            {/* Floating Points Animation Container */}
            {floatingPoints.map(fp => (
              <div 
                key={fp.id}
                className="absolute left-1/2 top-0 pointer-events-none animate-float-up z-20 font-black text-4xl text-yellow-400 drop-shadow-md"
                style={{ marginLeft: `${fp.x}px`, marginTop: `${fp.y}px` }}
              >
                +{fp.value}
              </div>
            ))}

            <form onSubmit={checkAnswer} className="space-y-4 max-w-md mx-auto relative">
              {/* Multiple Choice Mode */}
              {currentWord.options && currentWord.options.length > 0 ? (
                <div className="relative">
                  <label className="block text-center text-xs sm:text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">בחר את התשובה הנכונה</label>
                  <div className="space-y-3">
                    {currentWord.options.map((option, index) => {
                      const isCorrect = currentWord.correctIndex === index;
                      const isSelected = userAnswer === option;
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (feedback !== 'none') return; // Already answered
                            
                            setUserAnswer(option);
                            
                            // Check if correct and process
                            setTimeout(() => {
                              const nextTurn = turnCount + 1;
                              setTurnCount(nextTurn);
                              
                              if (isCorrect) {
                                // Correct answer
                                setFeedback('exact');
                                safePlaySound('success');
                                setDotsFeedback('success');
                                const points = 10;
                                setCurrentPoints(prev => prev + points);
                                setStreak(prev => {
                                  const newStreak = prev + 1;
                                  if (newStreak > maxStreak) setMaxStreak(newStreak);
                                  return newStreak;
                                });
                                addFloatingPoints(points);
                                createConfetti();
                                
                                // Update word progress
                                const updatedWords = activeWords.map(w => 
                                  w.id === currentWord.id 
                                    ? { ...w, successCount: REQUIRED_WINS, lastPlayedTurn: nextTurn }
                                    : w
                                );
                                setActiveWords(updatedWords);
                                persistProgress(updatedWords);
                                
                                setTimeout(() => pickNextWord(updatedWords, nextTurn), 2500);
                              } else {
                                // Wrong answer
                                setFeedback('wrong');
                                safePlaySound('error');
                                setDotsFeedback('error');
                                setStreak(0);
                                
                                const updatedWords = activeWords.map(w => 
                                  w.id === currentWord.id 
                                    ? { ...w, lastPlayedTurn: nextTurn }
                                    : w
                                );
                                setActiveWords(updatedWords);
                                persistProgress(updatedWords);
                                
                                // Extended delay for wrong answers in multiple choice (Past Tense) - 8 seconds to read explanation
                                setTimeout(() => pickNextWord(updatedWords, nextTurn), 8000);
                              }
                            }, 100);
                          }}
                          disabled={feedback !== 'none'}
                          className={`w-full text-right text-sm sm:text-base font-bold p-3 rounded-xl border-2 transition-all ${
                            feedback === 'exact' && isSelected
                              ? 'border-green-500 bg-green-900/30 text-green-200 ring-2 ring-green-500/50'
                              : feedback === 'wrong' && isSelected
                                ? 'border-red-500 bg-red-900/30 text-red-200'
                                : feedback !== 'none' && isCorrect
                                  ? 'border-green-500 bg-green-900/20 text-green-300'
                                  : 'border-slate-600 bg-slate-900 text-slate-200 hover:border-yellow-500 hover:bg-slate-800'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Text Input Mode (original) */
                <div className="relative">
                  <label className={`block text-center text-xs sm:text-sm font-bold mb-2 uppercase tracking-wider ${
                    isSentenceMode 
                      ? 'text-yellow-300 bg-yellow-900/20 py-2 rounded-lg border border-yellow-700/30' 
                      : 'text-slate-400'
                  }`}>
                    {hasMultipleBlanks ? 'השלימו את המילים החסרות (עם פסיק ביניהן)' : isSentenceMode ? 'השלימו את המילה החסרה' : 'תרגום לעברית'}
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={feedback !== 'none'}
                    autoComplete="off"
                    className={`w-full text-center text-base sm:text-xl font-bold p-4 rounded-2xl border-2 outline-none transition-all shadow-inner placeholder-slate-600 ${
                      feedback === 'wrong' 
                        ? 'border-red-500 bg-red-900/20 text-red-200 animate-shake' 
                        : feedback === 'exact' 
                          ? 'border-green-500 bg-green-900/20 text-green-200 ring-2 ring-green-500/50'
                          : feedback === 'close'
                            ? 'border-yellow-500 bg-yellow-900/20 text-yellow-200' 
                            : 'border-slate-600 bg-slate-900 text-yellow-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20'
                    }`}
                    placeholder={hasMultipleBlanks ? 'walked, ate' : isSentenceMode ? 'הקלד את המילה החסרה' : 'הקלד את התרגום'}
                  />
                </div>
              )}

              {/* Feedback States */}
              <div className="min-h-[60px] flex items-center justify-center">
                {feedback === 'wrong' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-3xl mb-1">❌</div>
                    <p className="text-red-400 font-bold text-sm sm:text-base">אופס! התשובה הנכונה היא:</p>
                    <p className="text-base sm:text-lg font-black text-white">
                      {currentWord.options && currentWord.correctIndex !== undefined 
                        ? currentWord.options[currentWord.correctIndex]
                        : currentWord.hebrew}
                    </p>
                    {currentWord.explanation && (
                      <div className="mt-2 p-2 bg-red-900/20 rounded-lg text-xs sm:text-sm text-slate-100 border border-red-700" dir="rtl">
                        <p className="text-red-300 font-bold mb-1">הסבר:</p>
                        <div className="whitespace-normal break-words hebrew-text">{currentWord.explanation}</div>
                      </div>
                    )}
                    {isSentenceMode && revealedTranslation && !currentWord.options && (
                      <div className="mt-3 p-3 bg-slate-900/70 rounded-lg text-sm text-slate-100 border border-slate-700" dir="rtl">
                        <p className="text-yellow-300 font-bold mb-1">תרגום:</p>
                        <div className="whitespace-normal break-words hebrew-text">{revealedTranslation}</div>
                      </div>
                    )}
                    {loadingReveal && isSentenceMode && !currentWord.options && (
                      <div className="mt-3 p-3 bg-slate-900/70 rounded-lg text-sm text-slate-100 border border-slate-700" dir="rtl">
                        <div className="text-yellow-300">מתרגם...</div>
                      </div>
                    )}
                  </div>
                )}

                {feedback === 'close' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-3xl mb-1">⚠️</div>
                    <p className="text-yellow-400 font-bold text-sm sm:text-base">קרוב! (1 נקודה)</p>
                    <p className="text-slate-400">הכתיב המדויק: <span className="font-black text-white">{currentWord.hebrew}</span></p>
                  </div>
                )}

                {feedback === 'exact' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-4xl mb-1 drop-shadow-lg">✨</div>
                    <p className="text-green-400 font-black text-xl sm:text-2xl tracking-tight text-shadow-glow">מצוין!</p>
                    {currentWord.explanation && (
                      <div className="mt-3 p-3 bg-green-900/20 rounded-lg text-sm text-slate-100 border border-green-700" dir="rtl">
                        <p className="text-green-300 font-bold mb-1">הסבר:</p>
                        <div className="whitespace-normal break-words hebrew-text">{currentWord.explanation}</div>
                      </div>
                    )}
                  </div>
                )}

                {feedback === 'none' && (
                  <div className="w-full flex flex-col gap-3">
                    {/* Hide submit button for multiple choice (auto-submits) */}
                    {!currentWord.options && (
                      <button
                        type="submit"
                        disabled={!userAnswer.trim()}
                        className="w-full btn-3d bg-yellow-700 hover:bg-yellow-600 text-slate-900 py-3 rounded-xl font-black text-base sm:text-lg shadow-lg border-b-4 border-yellow-900 disabled:opacity-50 disabled:shadow-none disabled:transform-none disabled:border-b-0"
                      >
                        בדיקה
                      </button>
                    )}
                    {showHint && (isSentenceMode || currentWord.options) && (
                      <div className="mt-3 p-3 bg-slate-900/60 rounded-lg text-sm text-slate-100 border border-slate-700" dir="rtl">
                        {hintTranslation ? (
                          <div className="whitespace-normal break-words hebrew-text">{hintTranslation}</div>
                        ) : (
                          <div className="hebrew-text">ממתין לרמז...</div>
                        )}
                      </div>
                    )}
                    {revealedAnswer && (
                      <div className="mt-3 p-3 bg-slate-900/70 rounded-lg text-sm text-slate-100 border border-slate-700">
                        <div className="font-bold text-yellow-200 mb-1">המילה הנכונה: <span className="text-white">{revealedAnswer}</span></div>
                        <div dir="rtl" className="hebrew-text text-xs text-slate-300">{loadingReveal ? 'מטעין תרגום...' : (revealedTranslation || '')}</div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        // If hint is already shown, hide it
                        if (showHint) {
                          setShowHint(false);
                          return;
                        }
                        
                        // Otherwise, load and show the hint
                        if ((isSentenceMode || currentWord.options) && currentWord) {
                          setLoadingHint(true);
                          const textToTranslate = currentWord.english;
                          try {
                            // For multiple choice, translate the whole question
                            // For sentence mode, translate but keep underscores in place
                            let translatedText;
                            if (currentWord.options) {
                              // Multiple choice - translate entire question
                              translatedText = await translateSentence(textToTranslate);
                            } else {
                              // Sentence mode - preserve underscores
                              translatedText = await translateMaskedPreservePlace(textToTranslate);
                            }
                            setHintTranslation(translatedText || localTranslateSegment(textToTranslate));
                          } catch (e) {
                            setHintTranslation(localTranslateSegment(textToTranslate));
                          } finally {
                            setLoadingHint(false);
                            setShowHint(true);
                          }
                        } else {
                          setShowHint(true);
                        }
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-yellow-400 transition-colors py-2"
                    >
                      {(isSentenceMode || currentWord.options) ? (loadingHint ? 'מטעין רמז...' : (showHint ? 'הסתר רמז' : 'צריך רמז? 💡')) : (showHint ? `אות ראשונה: ${currentWord.hebrew.charAt(0)}` : 'צריך רמז? 💡')}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;