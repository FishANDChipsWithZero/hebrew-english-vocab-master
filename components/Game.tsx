import React, { useState, useEffect, useRef } from 'react';
import BackButton from './BackButton';
import { WordPair, User } from '../types';
import { checkAnswerQuality, createConfetti, AnswerQuality, playSound } from '../utils';
import { translateSentence } from '../services/geminiService';

interface GameProps {
  words: WordPair[];
  user: User;
  // optional preset filename to persist progress per band
  presetFilename?: string | null;
  onFinish: () => void;
  onBack: () => void;
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

const Game: React.FC<GameProps> = ({ words, user, presetFilename, onFinish, onBack }) => {
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
          const key = presetFilename ? `progress:${presetFilename}` : null;
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
      // Load session XP for the detected mode (words/sentences) and then pick next
      try {
        // Prefer a preset-scoped session key when available (keeps XP per preset),
        // otherwise fall back to the mode-based key (words / sentences).
          const sessionKey = presetFilename ? `session_xp:${presetFilename}` : sessionKeyFor(isSentenceBatch ? 'sentences' : 'words');
          // prefer preset-scoped + user if available
          const keyToTry = presetFilename ? `session_xp:${userId}:${presetFilename}` : `session_xp:${userId}:${isSentenceBatch ? 'sentences' : 'words'}`;
          const raw = sessionStorage.getItem(keyToTry) || sessionStorage.getItem(sessionKey);
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
  }, [words, presetFilename]);

      // Persist XP to sessionStorage whenever it changes for the current mode
      useEffect(() => {
        try {
          if (!loadedSessionRef.current) return;
          const payload = { currentPoints, streak, maxStreak };
          // persist per-user preset key (if present) and per-user mode key
          const userPresetKey = presetFilename ? `session_xp:${userId}:${presetFilename}` : null;
          if (userPresetKey) sessionStorage.setItem(userPresetKey, JSON.stringify(payload));
          sessionStorage.setItem(`session_xp:${userId}:${modeType}`, JSON.stringify(payload));
        } catch (e) {
          // ignore storage failures
        }
      }, [currentPoints, streak, maxStreak, modeType]);

  // Persist progress helper (per-preset in localStorage)
  const persistProgress = (list: WordPair[]) => {
    try {
      if (!presetFilename) return;
      const key = `progress:${presetFilename}`;
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
  const parseWordDisplay = (text: string) => {
    if (!text) return { word: '', pos: null };

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

  // Translate each non-underscore segment individually and reassemble so underscores
  // end up positioned according to the translated surrounding segments (better for RTL Hebrew).
  const translateMaskedPreservePlace = async (masked: string) => {
    const containsHebrew = (s: string) => /[\u0590-\u05FF]/.test(s);
    const parts = masked.split(/(_+)/);
    const outParts: string[] = [];
    for (const part of parts) {
      if (/^_+$/.test(part)) {
        // keep underscores as-is
        outParts.push(part);
        continue;
      }
      // try server translate for the segment
      try {
        const t = await translateSentence(part);
        if (t && containsHebrew(t)) {
          outParts.push(t);
          continue;
        }
      } catch (e) {
        // fall through to local heuristic
      }

      // fallback: local heuristic translate for this segment
      outParts.push(localTranslateSegment(part));
    }

    // Join the translated parts. We keep whitespace as produced by translations.
    return outParts.join('');
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

    const quality = checkAnswerQuality(userAnswer, currentWord.hebrew);
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
      const points = 2 + (streak > 2 ? 1 : 0); // Bonus for streak
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
      setCurrentPoints(prev => prev + 1);
      setStreak(0); 
      addFloatingPoints(1);
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
            const t = await translateSentence(filled);
            setRevealedTranslation(t || '');
          } catch (e) {
            setRevealedTranslation('לא ניתן לתרגם כרגע');
          } finally {
            setLoadingReveal(false);
            // Wait one second for the student to see the revealed filled sentence, then continue
            setTimeout(() => {
              // Persist state and pick next
              persistProgress(updatedWords);
              pickNextWord(updatedWords, nextTurn);
            }, 1000);
          }
        })();
      } else {
        // non-sentence wrong answer: show the correct answer a bit longer so student can see it
        setTimeout(() => pickNextWord(updatedWords, nextTurn), 4000);
      }
    }
  };

  if (!currentWord) return <div className="text-center p-10 font-bold text-2xl animate-pulse text-cyan-400">טוען משחק...</div>;

  const wordsDone = activeWords.filter(w => w.successCount >= REQUIRED_WINS).length;
  const totalWords = activeWords.length;
  const progressPercentage = Math.round((wordsDone / totalWords) * 100);

  const parsedWord = parseWordDisplay(currentWord.english);

  // Detect whether the current word is a sentence-fill exercise.
  const isSentenceMode = Boolean(currentWord && (currentWord.english.includes('_') || (currentWord.id && String(currentWord.id).startsWith('s'))));

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
    <div className="max-w-2xl w-full mx-auto px-4">
      {/* Top Bar: User & Score */}
      <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-lg p-3 mb-6 border border-slate-600 relative overflow-hidden neon-border">
        <div className="flex items-center gap-3 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-2xl shadow-inner flex-shrink-0 overflow-hidden">
            {user.avatar ? (
              <img src={`/avatars/${user.avatar}`} alt={`${user.name} avatar`} className={`avatar-img ${avatarPosClass}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold bg-slate-700">{(user.name || '').charAt(0).toUpperCase() || 'ת'}</div>
            )}
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-white text-lg truncate">{user.name}</div>
            <div className="text-sm font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
               XP: {currentPoints}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Back button to return to input selection */}
          <div className="relative z-10">
            <BackButton onClick={() => onBack?.()} small>
              חזור
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
      <div className="mb-6 relative">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 px-1">
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
          <div className="bg-slate-900 p-6 md:p-8 text-center relative overflow-hidden min-h-[220px] flex flex-col justify-center items-center group">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900 via-slate-950 to-slate-950"></div>
            
            {/* Word - Adjusted with break-words and responsive text sizing */}
            <div className="w-full px-2 z-10">
              {sentenceBank.length > 0 && (
                <div className="mb-3 w-full">
                  <div className="text-sm font-black tracking-wide mb-2 sentence-bank-header">מחסן מילים</div>
                  <div className="flex flex-wrap gap-2">
                    {sentenceBank.map((w, idx) => (
                      <span key={idx} className="inline-block bg-slate-900/70 text-white px-3 py-1 rounded-full text-xs font-bold">{w}</span>
                    ))}
                  </div>
                </div>
              )}
              <h2 className={`${isSentenceMode ? 'text-2xl md:text-4xl' : 'text-3xl md:text-5xl'} font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] tracking-wide break-words whitespace-normal leading-tight mb-2 flex items-center justify-center gap-3`}>
                <span dir="ltr" className="text-left">{parsedWord.word}</span>
                {currentWord && currentWord.successCount >= REQUIRED_WINS && (
                  <span className="inline-flex items-center gap-2 bg-green-700/20 border border-green-500 text-green-200 text-sm font-bold px-3 py-1 rounded-full">
                    ✅ <span>מוכר</span>
                  </span>
                )}
              </h2>
              {/* Distinct Part of Speech Badge */}
              {parsedWord.pos && (
                <div className="mb-4">
                  <span className="inline-block bg-fuchsia-900/50 border border-fuchsia-500 text-fuchsia-300 px-3 py-1 rounded-full text-xs md:text-sm font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(217,70,239,0.3)] neon-text-glow">
                    {parsedWord.pos}
                  </span>
                </div>
              )}
            </div>
            
            <button 
              onClick={playAudio}
              type="button"
              className="relative z-10 btn-3d bg-cyan-700 hover:bg-cyan-600 text-white border-b-4 border-cyan-900 rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm transition-all active:border-b-0 active:translate-y-1 shadow-lg mt-2"
            >
              <span>🔊</span> שמע הגייה
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
          <div className="p-6 md:p-8 bg-slate-800 relative">
            
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

            <form onSubmit={checkAnswer} className="space-y-6 max-w-md mx-auto relative">
              <div className="relative">
                <label className="block text-center text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">{isSentenceMode ? 'השלימו את המילה החסרה' : 'תרגום לעברית'}</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={feedback !== 'none'}
                  autoComplete="off"
                  className={`w-full text-center text-xl md:text-2xl font-bold p-5 rounded-2xl border-2 outline-none transition-all shadow-inner placeholder-slate-600 ${
                    feedback === 'wrong' 
                      ? 'border-red-500 bg-red-900/20 text-red-200 animate-shake' 
                      : feedback === 'exact' 
                        ? 'border-green-500 bg-green-900/20 text-green-200 ring-2 ring-green-500/50'
                        : feedback === 'close'
                          ? 'border-yellow-500 bg-yellow-900/20 text-yellow-200' 
                          : 'border-slate-600 bg-slate-900 text-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20'
                  }`}
                  placeholder={isSentenceMode ? 'הקלד את המילה החסרה' : 'הקלד את התרגום'}
                />
              </div>

              {/* Feedback States */}
              <div className="min-h-[80px] flex items-center justify-center">
                {feedback === 'wrong' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-4xl mb-1">❌</div>
                    <p className="text-red-400 font-bold text-lg">אופס! התשובה היא:</p>
                    <p className="text-xl font-black text-white">{currentWord.hebrew}</p>
                    {isSentenceMode && revealedTranslation && (
                      <div className="mt-3 p-3 bg-slate-900/70 rounded-lg text-sm text-slate-100 border border-slate-700" dir="rtl">
                        <div className="whitespace-normal break-words hebrew-text">{revealedTranslation}</div>
                      </div>
                    )}
                  </div>
                )}

                {feedback === 'close' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-4xl mb-1">⚠️</div>
                    <p className="text-yellow-400 font-bold text-lg">קרוב! (1 נקודה)</p>
                    <p className="text-slate-400">הכתיב המדויק: <span className="font-black text-white">{currentWord.hebrew}</span></p>
                  </div>
                )}

                {feedback === 'exact' && (
                  <div className="text-center animate-pop-in">
                    <div className="text-5xl mb-1 drop-shadow-lg">✨</div>
                    <p className="text-green-400 font-black text-3xl tracking-tight text-shadow-glow">מצוין!</p>
                  </div>
                )}

                {feedback === 'none' && (
                  <div className="w-full flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={!userAnswer.trim()}
                      className="w-full btn-3d bg-fuchsia-700 hover:bg-fuchsia-600 text-white py-4 rounded-xl font-black text-xl shadow-lg border-b-4 border-fuchsia-900 disabled:opacity-50 disabled:shadow-none disabled:transform-none disabled:border-b-0"
                    >
                      בדיקה
                    </button>
                    {showHint && isSentenceMode && (
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
                        <div className="font-bold text-cyan-200 mb-1">המילה הנכונה: <span className="text-white">{revealedAnswer}</span></div>
                        <div dir="rtl" className="hebrew-text text-xs text-slate-300">{loadingReveal ? 'מטעין תרגום...' : (revealedTranslation || '')}</div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (isSentenceMode && currentWord) {
                          setLoadingHint(true);
                          const masked = currentWord.english;
                          const containsHebrew = (s: string) => /[\u0590-\u05FF]/.test(s);
                          try {
                            // First, try translating the whole sentence (preserve underscores via server)
                            let fullTranslated: string | null = null;
                            try {
                              const t = await translateSentence(masked);
                              if (t && containsHebrew(t)) fullTranslated = t;
                            } catch (e) {
                              fullTranslated = null;
                            }

                            if (fullTranslated) {
                              setHintTranslation(fullTranslated);
                            } else {
                              // Fallback: segmented translate to preserve underscore placement
                              try {
                                const seg = await translateMaskedPreservePlace(masked);
                                setHintTranslation(seg);
                              } catch (e) {
                                setHintTranslation(localTranslateSegment(masked));
                              }
                            }
                          } finally {
                            setLoadingHint(false);
                            setShowHint(true);
                          }
                        } else {
                          setShowHint(true);
                        }
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors py-2"
                    >
                      {isSentenceMode ? (loadingHint ? 'מטעין רמז...' : (showHint ? 'הסתר רמז' : 'צריך רמז? 💡')) : (showHint ? `אות ראשונה: ${currentWord.hebrew.charAt(0)}` : 'צריך רמז? 💡')}
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