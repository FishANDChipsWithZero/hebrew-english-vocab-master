import React, { useState, useEffect } from 'react';
import BackButton from './BackButton';
import VocabModal from './VocabModal';
import { extractWordsFromImage, extractWordsFromText, loadPresetBand } from '../services/geminiService';
import { WordPair, User } from '../types';
import { getGenderedText } from '../genderUtils';

interface InputSelectionProps {
  user: User | null;
  // second optional param is the source preset filename (when available)
  onWordsReady: (words: WordPair[], presetFilename?: string | null) => void;
  setLoading: (loading: boolean) => void;
  presetFilename?: string | null;
  // when true the component will auto-load the preset on mount; otherwise it will only show the UI
  autoLoadOnMount?: boolean;
  onBack?: () => void;
  onResume?: () => void;
}

const InputSelection: React.FC<InputSelectionProps> = ({ user, onWordsReady, setLoading, presetFilename, autoLoadOnMount = false, onBack, onResume }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Array<{ displayName: string; filename: string }>>([]);
  const [showVocab, setShowVocab] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/bands/index.json');
        if (!res.ok) return; // no index present
        const list = await res.json();
        if (!mounted) return;
        setPresets(list);
      } catch (err) {
        // ignore, keep fallback
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  
  // If a preset filename is provided, auto-load it and skip input options
  // Only auto-load a preset on mount if explicitly requested (prevents auto-jump when returning from Game)
  useEffect(() => {
    let mounted = true;
    if (!presetFilename || !autoLoadOnMount) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const words = await loadPresetBand(presetFilename);
        if (!mounted) return;
        if (!words || words.length === 0) throw new Error('No words loaded');
        onWordsReady(words, presetFilename);
      } catch (e: any) {
        console.error(e);
        setError('לא ניתן לטעון את הקבוצה המבוקשת');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [presetFilename, autoLoadOnMount]);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const words = await extractWordsFromText(textInput);
      if (words.length === 0) throw new Error("לא נמצאו מילים");
      onWordsReady(words);
    } catch (err: any) {
      setError("שגיאה בעיבוד הטקסט. נסה שנית.");
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const words = await extractWordsFromImage(base64);
        if (words.length === 0) throw new Error("לא נמצאו מילים בתמונה");
        onWordsReady(words);
      } catch (err: any) {
        console.error(err);
        setError("שגיאה בעיבוד התמונה. וודא שהטקסט ברור.");
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
    <div className="w-full max-w-2xl mx-auto bg-slate-800/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700 animate-slide-up relative z-10 neon-border">
      <div className="relative mb-3 sm:mb-5">
        <h2 className="text-base sm:text-lg md:text-xl font-black text-center text-white neon-text-glow pr-12 sm:pr-0">
          {getGenderedText(user, 'בחר מה ללמוד/לתרגל', 'בחרי מה ללמוד/לתרגל', 'בחר/י מה ללמוד/לתרגל')}
        </h2>
        {/** Back button to return to onboarding (only shown when handler provided) */}
        {typeof onBack === 'function' && (
          <div className="absolute top-0 right-0">
            <BackButton onClick={() => onBack && onBack()} small>
              הגדרות
            </BackButton>
          </div>
        )}
      </div>

      {/* Resume button - shows if there's an active preset */}
      {presetFilename && onResume && (
        <div className="mb-4 text-center">
          <button
            onClick={onResume}
            className="btn-3d bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-extrabold py-2.5 px-6 rounded-2xl shadow-xl text-sm sm:text-base transition-transform transform hover:scale-105 active:scale-95 motion-reduce:transition-none animate-pulse-slow"
          >
            <span className="inline-block mr-1 text-base">▶️</span>
            <span className="align-middle">המשך תרגול</span>
            <div className="text-[10px] sm:text-xs mt-0.5 opacity-80">ההתקדמות שלך נשמרה</div>
          </button>
        </div>
      )}

      {/* Classroom preset - only Unit 2 button (students cannot add words) */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
                  const words = await loadPresetBand('unit2_new_direction_plus.json');
                  if (!words || words.length === 0) throw new Error('No words loaded');
              onWordsReady(words, 'unit2_new_direction_plus.json');
            } catch (e: any) {
              console.error(e);
              setError('לא ניתן לטעון את ה‑UNIT 2. בדוק שהקובץ קיים ב־/public/bands');
              setLoading(false);
            }
          }}
          className={`btn-3d bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-slate-900 font-extrabold py-2.5 px-5 rounded-2xl shadow-xl text-sm sm:text-base transition-transform transform hover:scale-105 active:scale-95 motion-reduce:transition-none ${presetFilename === 'unit2_new_direction_plus.json' ? 'ring-4 ring-cyan-500/30' : ''}`}
        >
          <span className="inline-block mr-1 text-base">🚀</span>
          <span className="align-middle">תרגול מילים</span>
        </button>

        <button
          onClick={() => setShowVocab(true)}
          className={`btn-3d bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold py-2.5 px-4 rounded-2xl shadow-xl text-sm sm:text-base transition-transform transform hover:scale-105 active:scale-95`}
        >
          <span className="inline-block mr-1 text-base">📚</span>
          <span className="align-middle">אוצר המילים</span>
        </button>

        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const words = await loadPresetBand('sentences_practice.json');
              if (!words || words.length === 0) throw new Error('No sentences loaded');
              onWordsReady(words, 'sentences_practice.json');
            } catch (e: any) {
              console.error(e);
              setError('לא ניתן לטעון את קבצי התרגול. בדוק שהקובץ קיים ב־/public/bands');
              setLoading(false);
            }
          }}
          className={`btn-3d bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-extrabold py-2.5 px-5 rounded-2xl shadow-xl text-sm sm:text-base transition-transform transform hover:scale-105 active:scale-95 motion-reduce:transition-none ${presetFilename === 'sentences_practice.json' ? 'ring-4 ring-cyan-500/30' : ''}`}
        >
          <span className="inline-block mr-1 text-base">✍️</span>
          <span className="align-middle">תרגול משפטים</span>
        </button>
      </div>

      {/* Past Simple / Progressive Buttons */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const words = await loadPresetBand('past_simple_progressive.json');
              if (!words || words.length === 0) throw new Error('No past tense exercises loaded');
              onWordsReady(words, 'past_simple_progressive.json');
            } catch (e: any) {
              console.error(e);
              setError('לא ניתן לטעון את תרגילי Past Simple/Progressive');
              setLoading(false);
            }
          }}
          className={`btn-3d bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-extrabold py-2.5 px-4 rounded-2xl shadow-xl text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95 motion-reduce:transition-none ${presetFilename === 'past_simple_progressive.json' ? 'ring-4 ring-cyan-500/30' : ''}`}
        >
          <span className="inline-block mr-1 text-sm">⏰</span>
          <span className="align-middle">Past Simple / Progressive - תרגול</span>
        </button>

        <button
          onClick={() => {
            // Navigate to learning mode
            onWordsReady([], 'learn_past_tense');
          }}
          className="btn-3d bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold py-2.5 px-4 rounded-2xl shadow-xl text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95 motion-reduce:transition-none"
        >
          <span className="inline-block mr-1 text-sm">📖</span>
          <span className="align-middle">Past Simple / Progressive - לימוד</span>
        </button>
      </div>

      {/* Reset Progress Button */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => {
            if (confirm('האם אתה בטוח שברצונך לאפס את כל ההתקדמות? פעולה זו תמחק את כל המילים שכבר למדת.')) {
              // Get user ID from user object
              const userId = (user?.name || 'anon').replace(/\s+/g, '_');
              // Clear all progress for this user
              const keys = Object.keys(localStorage).filter(k => k.startsWith(`progress:${userId}:`));
              keys.forEach(k => localStorage.removeItem(k));
              // Also clear XP
              localStorage.removeItem(`xp:${userId}`);
              alert('ההתקדמות אופסה בהצלחה! עכשיו תוכל להתחיל מחדש.');
            }
          }}
          className="btn-3d bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-1.5 px-4 rounded-xl text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95"
        >
          <span className="inline-block mr-1 text-sm">🔄</span>
          <span className="align-middle">איפוס התקדמות</span>
        </button>
      </div>

      {/* load available presets index on mount */}
      

      {/* Classroom-only: disable manual input. The original text/image upload UI is commented out for the next version. */}
      {/*
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl mb-8 font-bold border border-slate-700">
        ...Paste / Image tabs (hidden in classroom mode)...
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 text-red-400 rounded-xl border border-red-800 text-sm font-bold flex items-center gap-2 animate-shake">
          <span>⚠️</span> {error}
        </div>
      )}

      {activeTab === 'text' ? (
        <div className="space-y-4 animate-pop-in">
          ...text input area (disabled for classroom)...
        </div>
      ) : (
        <div className="animate-pop-in">
          ...image upload area (disabled for classroom)...
        </div>
      )}
      */}
    </div>
      <VocabModal open={showVocab} onClose={() => setShowVocab(false)} />
    </>
  );
};

export default InputSelection;