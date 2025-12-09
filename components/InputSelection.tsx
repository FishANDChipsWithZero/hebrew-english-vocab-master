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
    <div className="w-full max-w-2xl mx-auto bg-luxury-card backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 border animate-slide-up relative z-10 luxury-container">
      <div className="relative mb-3 sm:mb-5">
        <h2 className="text-base sm:text-lg md:text-xl font-black text-center text-white neon-text-glow pr-12 sm:pr-0 heebo-font">
          {getGenderedText(user, 'בחר מה ללמוד/לתרגל', 'בחרי מה ללמוד/לתרגל', 'בחר/י מה ללמוד/לתרגל')}
        </h2>
        {/** Navigation buttons */}
        {typeof onBack === 'function' && (
          <div className="absolute top-0 left-0">
            <button onClick={() => onBack && onBack()} className="p-2 rounded-lg text-2xl opacity-60 hover:opacity-100 transition-opacity" title="הגדרות">
              ⚙️
            </button>
          </div>
        )}
      </div>

      {/* Resume button - shows if there's an active preset */}
      {presetFilename && onResume && (
        <div className="mb-4 text-center">
          <button
            onClick={onResume}
            className="heebo-font btn-3d btn-primary-gold font-extrabold py-2.5 px-6 rounded-2xl shadow-xl text-sm sm:text-base transform hover:scale-105 active:scale-95"
          >
            <span className="inline-block mr-1 text-base">▶️</span>
            <span className="align-middle">המשך תרגול</span>
            <div className="text-[10px] sm:text-xs mt-0.5 opacity-80">ההתקדמות שלך נשמרה</div>
          </button>
        </div>
      )}

      {/* Classroom preset - cleaner unified design */}
      <div className="mb-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
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
          className={`heebo-font btn-secondary-gold font-bold py-4 px-4 rounded-xl shadow-lg text-sm transition-transform transform hover:scale-105 active:scale-95 ${presetFilename === 'unit2_new_direction_plus.json' ? 'ring-2 ring-gold' : ''}`}
        >
          <div>תרגול מילים</div>
        </button>

        <button
          onClick={() => setShowVocab(true)}
          className="heebo-font btn-secondary-gold font-bold py-4 px-4 rounded-xl shadow-lg text-sm transition-transform transform hover:scale-105 active:scale-95"
        >
          <div>אוצר המילים</div>
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
          className={`heebo-font col-span-2 btn-secondary-gold font-bold py-4 px-4 rounded-xl shadow-lg text-sm transition-transform transform hover:scale-105 active:scale-95 ${presetFilename === 'sentences_practice.json' ? 'ring-2 ring-gold' : ''}`}
        >
          <span className="align-middle">תרגול משפטים</span>
        </button>
      </div>

      {/* Past Simple / Progressive Buttons */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
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
          className={`heebo-font btn-secondary-gold font-bold py-4 px-4 rounded-xl shadow-lg text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95 ${presetFilename === 'past_simple_progressive.json' ? 'ring-2 ring-gold' : ''}`}
        >
          <div>Past Simple/Progressive</div>
          <div className="text-[10px] opacity-75 mt-1">תרגול</div>
        </button>

        <button
          onClick={() => {
            // Navigate to learning mode
            onWordsReady([], 'learn_past_tense');
          }}
          className="heebo-font btn-secondary-gold font-bold py-4 px-4 rounded-xl shadow-lg text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95"
        >
          <div>Past Simple/Progressive</div>
          <div className="text-[10px] opacity-75 mt-1">לימוד</div>
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
          className="heebo-font btn-3d btn-secondary-gold font-bold py-2 px-4 rounded-xl text-xs sm:text-sm transition-transform transform hover:scale-105 active:scale-95"
        >
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