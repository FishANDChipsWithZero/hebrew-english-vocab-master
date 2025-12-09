import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { getGenderedText } from '../genderUtils';
import { playSound } from '../utils';

interface OnboardingProps {
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user: googleUser } = useAuth();
  
  // Load saved preferences from localStorage
  const savedPrefs = localStorage.getItem('user_preferences');
  const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
  
  const [name, setName] = useState(googleUser?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(prefs.gender || 'male');
  const [avatars, setAvatars] = useState<Array<{ displayName: string; filename: string; posClass?: string }>>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(prefs.avatar || null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/avatars/index.json');
        if (!res.ok) return;
        const list = await res.json();
        if (!mounted) return;
        setAvatars(list);
        // Only set default avatar if no saved preference
        if (list.length > 0 && !prefs.avatar) setSelectedAvatar(list[0].filename);
      } catch (e) {
        // ignore, fallback to bundled avatars
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      // Save preferences to localStorage
      localStorage.setItem('user_preferences', JSON.stringify({
        gender,
        avatar: selectedAvatar
      }));
      onComplete({ name, avatar: selectedAvatar ?? undefined, gender });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-slide-up px-2 sm:px-4">
      <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700 relative overflow-hidden neon-border">
        
        {/* Decorative background blobs (moved/toned down to avoid overlapping avatars) */}
        <div className="absolute -top-28 -right-36 w-28 h-28 bg-yellow-700 rounded-full blur-[60px] opacity-20 pointer-events-none -z-10"></div>
        <div className="absolute -bottom-28 -left-36 w-28 h-28 bg-yellow-700 rounded-full blur-[60px] opacity-18 pointer-events-none -z-10"></div>

        <div className="relative z-10">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-lg sm:text-xl font-bold text-slate-300 mb-2">
              👋 היי, {googleUser?.name || 'משתמש'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">שם משתמש:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all outline-none font-bold text-base bg-slate-900/50 text-white placeholder-slate-600"
                placeholder="איך לקרוא לך?"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">מגדר:</label>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                    gender === 'male'
                      ? 'bg-yellow-600 text-slate-900 ring-2 ring-yellow-400'
                      : 'bg-slate-900/50 text-slate-400 border border-slate-600 hover:border-yellow-500'
                  }`}
                >
                  זכר
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                    gender === 'female'
                      ? 'bg-yellow-600 text-slate-900 ring-2 ring-yellow-400'
                      : 'bg-slate-900/50 text-slate-400 border border-slate-600 hover:border-yellow-500'
                  }`}
                >
                  נקבה
                </button>
                <button
                  type="button"
                  onClick={() => setGender('other')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                    gender === 'other'
                      ? 'bg-yellow-600 text-slate-900 ring-2 ring-yellow-400'
                      : 'bg-slate-900/50 text-slate-400 border border-slate-600 hover:border-yellow-500'
                  }`}
                >
                  אחר
                </button>
              </div>
            </div>

            {/* Avatar gallery - smaller for mobile */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">
                {getGenderedText({ gender } as User, 'בחר אווטאר', 'בחרי אווטאר', 'בחר/י אווטאר')}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
                {avatars.map((a) => {
                  const isSelected = selectedAvatar === a.filename;
                  const posClass = a.posClass ? a.posClass : 'avatar-pos-35';
                  return (
                    <button
                      key={a.filename}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(a.filename);
                        playSound('pop');
                      }}
                      aria-label={`בחר ${a.displayName}`}
                        className={`relative w-full aspect-[1/1] p-0 rounded-full transition-all duration-300 transform focus:outline-none overflow-hidden group ${
                          isSelected
                          ? 'scale-110 ring-4 bg-transparent border-4 animate-pulse ring-gold-avatar' : 'bg-slate-900/40 border-2 border-slate-600 hover:scale-105 hover:shadow-lg'
                        }`}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-800/50 avatar-wrapper">
                          <img src={`/avatars/${a.filename}`} alt={a.displayName} className={`avatar-img ${posClass} ${isSelected ? 'brightness-110' : ''}`} />
                        </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg z-10 animate-bounce">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full btn-3d bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-slate-900 font-black py-3 px-5 rounded-xl text-base sm:text-lg shadow-lg mt-3 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-yellow-900"
            >
              {getGenderedText({ gender } as User, '🚀 בוא נתחיל!', '🚀 בואי נתחיל!', '🚀 בוא/י נתחיל!')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;