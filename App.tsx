import React, { useState, useEffect } from 'react';
import { AppStep, User, WordPair } from './types';
import Onboarding from './components/Onboarding';
import InputSelection from './components/InputSelection';
import Game from './components/Game';
import PastTenseLearn from './components/PastTenseLearn';
import { createConfetti, decodeWordsData } from './utils';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.ONBOARDING);
  const [user, setUser] = useState<User | null>(null);
  const [words, setWords] = useState<WordPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [presetFilename, setPresetFilename] = useState<string | null>(null);
  const [autoLoadOnMount, setAutoLoadOnMount] = useState<boolean>(false);

  // Check for shared data in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      const sharedWords = decodeWordsData(data);
      if (sharedWords.length > 0) {
        setWords(sharedWords);
        console.log("Loaded shared words:", sharedWords.length);
      }
    }
    // Support direct preset mode: ?preset=unit2 or ?preset=unit2_new_direction_plus.json
    const preset = params.get('preset');
    const autostart = params.get('autostart') || params.get('skipOnboarding');
    setAutoLoadOnMount(Boolean(autostart));
    if (preset) {
      const filename = preset === 'unit2' ? 'unit2_new_direction_plus.json' : preset;
      setPresetFilename(filename);
      (async () => {
        try {
          const res = await fetch(`/bands/${filename}`);
          if (!res.ok) return;
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setWords(list as WordPair[]);
            console.log('Loaded preset words from', filename, list.length);
            // If autostart/skipOnboarding parameter is present, create a default user and jump straight to game
            if (autostart) {
              const defaultUser: User = { name: 'תלמיד', avatar: undefined };
              setUser(defaultUser);
              setStep(AppStep.GAME);
            }
          }
        } catch (e) {
          console.warn('Failed to load preset', e);
        }
      })();
    }
  }, []);

  const handleUserComplete = (userData: User) => {
    setUser(userData);
    // If we already have words (from URL), skip input selection and go straight to game
    if (words.length > 0) {
      setStep(AppStep.GAME);
    } else {
      setStep(AppStep.INPUT_SELECTION);
    }
  };

  const handleWordsReady = (extractedWords: WordPair[], sourcePresetFilename?: string | null) => {
    setLoading(false);
    
    // Check if this is learning mode
    if (sourcePresetFilename === 'learn_past_tense') {
      setStep(AppStep.PAST_TENSE_LEARN);
      return;
    }
    
    setWords(extractedWords);
    if (sourcePresetFilename) setPresetFilename(sourcePresetFilename);
    setStep(AppStep.GAME);
  };

  const handleGameFinish = () => {
    setStep(AppStep.SUCCESS);
    const interval = setInterval(() => {
        createConfetti();
    }, 400);
    setTimeout(() => clearInterval(interval), 5000);
  };

  const handleRestart = () => {
    // Clear words only if we want to start fresh input. 
    // If it was a shared link, maybe we want to keep them? 
    // For now, let's clear to allow entering new words.
    setWords([]); 
    setStep(AppStep.INPUT_SELECTION);
    
    // Clear URL param so refresh doesn't reload old words
    const url = new URL(window.location.href);
    url.searchParams.delete('data');
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Clean Luxury Background - No animations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-luxury-primary"></div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-pop-in">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-8 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-8 rounded-full border-t-transparent animate-spin gold-spinner"></div>
          </div>
          <p className="font-bold text-2xl animate-pulse text-gold">מכין את המשחק...</p>
          <p className="text-cream mt-2 font-medium">זה ייקח כמה שניות</p>
        </div>
      )}

      {/* Header Logo */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-20">
        <div className="py-4 flex justify-center">
          <img src="/logo.jpg" alt="Pikmat" className="h-20 object-contain" />
        </div>
        <div className="gold-divider"></div>
      </div>

      <main className="w-full max-w-4xl z-10 flex flex-col items-center justify-center min-h-[600px] py-12">
        
        {step === AppStep.ONBOARDING && (
          <Onboarding onComplete={handleUserComplete} />
        )}

        {step === AppStep.INPUT_SELECTION && (
          <InputSelection 
            user={user} 
            onWordsReady={handleWordsReady} 
            setLoading={setLoading} 
            presetFilename={presetFilename} 
            autoLoadOnMount={autoLoadOnMount} 
            onBack={() => setStep(AppStep.ONBOARDING)}
            onResume={() => {
              // If we already have words and preset, just resume the game
              if (words.length > 0 && presetFilename) {
                setStep(AppStep.GAME);
              }
            }}
          />
        )}

        {step === AppStep.GAME && user && (
          <Game words={words} user={user} presetFilename={presetFilename} onFinish={handleGameFinish} onBack={() => {
            // When going back to practice selection, keep the words and preset so we can resume
            // Don't reset anything - just change the step
            setStep(AppStep.INPUT_SELECTION);
          }} onBackToSettings={() => setStep(AppStep.ONBOARDING)} />
        )}

        {step === AppStep.PAST_TENSE_LEARN && (
          <PastTenseLearn onBack={() => setStep(AppStep.INPUT_SELECTION)} onBackToSettings={() => setStep(AppStep.ONBOARDING)} />
        )}

        {step === AppStep.SUCCESS && user && (
          <div className="text-center bg-slate-800/90 backdrop-blur-lg p-10 md:p-14 rounded-[3rem] shadow-2xl max-w-xl mx-auto border-4 border-yellow-400 animate-pop-in relative neon-border heebo-font">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-8xl filter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-bounce">🏆</div>
            <h2 className="text-5xl font-black text-white mb-6 mt-8 neon-text-glow">
              ניצחון!
            </h2>
            <div className="bg-slate-900/50 rounded-2xl p-6 mb-8 border border-slate-700">
               <p className="text-2xl text-slate-200 font-bold mb-2">
                כל הכבוד {user.name}!
              </p>
              <p className="text-slate-400">
                סיימת את כל התרגול בהצלחה!
                <br/>
                <span className="font-bold text-gold">עבודה מצוינת!</span>
              </p>
            </div>
            
            <button
              onClick={handleRestart}
              className="w-full btn-3d btn-primary-gold py-5 px-8 rounded-2xl text-xl shadow-lg transform transition"
            >
              התחל רשימה חדשה ↺
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="fixed bottom-4 text-slate-600 text-xs text-center w-full pointer-events-none">
        <p className="opacity-60">Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;