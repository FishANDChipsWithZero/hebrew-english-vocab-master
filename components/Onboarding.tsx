import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface OnboardingProps {
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [avatars, setAvatars] = useState<Array<{ displayName: string; filename: string; posClass?: string }>>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/avatars/index.json');
        if (!res.ok) return;
        const list = await res.json();
        if (!mounted) return;
        setAvatars(list);
        if (list.length > 0) setSelectedAvatar(list[0].filename);
      } catch (e) {
        // ignore, fallback to bundled avatars
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ name, avatar: selectedAvatar ?? undefined });
    }
  };

  return (
    <div className="max-w-md w-full mx-auto animate-slide-up px-4">
      <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700 relative overflow-hidden neon-border">
        
        {/* Decorative background blobs (moved/toned down to avoid overlapping avatars) */}
        <div className="absolute -top-28 -right-36 w-28 h-28 bg-purple-700 rounded-full blur-[60px] opacity-20 pointer-events-none -z-10"></div>
        <div className="absolute -bottom-28 -left-36 w-28 h-28 bg-cyan-700 rounded-full blur-[60px] opacity-18 pointer-events-none -z-10"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 neon-text-glow">
            ברוכים הבאים
          </h1>
          <p className="text-center text-slate-400 mb-8 font-medium">הכנסו את הפרטים כדי להתחיל לשחק</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">השם שלך</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none font-bold text-lg bg-slate-900/50 text-white placeholder-slate-600"
                placeholder="איך לקרוא לך?"
              />
            </div>

            {/* Removed gender selection — only name and avatar are required */}

            {/* Avatar gallery - improved visual tiles */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">בחר אווטאר</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {avatars.map((a) => {
                  const isSelected = selectedAvatar === a.filename;
                  const posClass = a.posClass ? a.posClass : 'avatar-pos-35';
                  return (
                    <button
                      key={a.filename}
                      type="button"
                      onMouseEnter={() => setHoveredAvatar(a.filename)}
                      onMouseLeave={() => setHoveredAvatar(null)}
                      onFocus={() => setHoveredAvatar(a.filename)}
                      onBlur={() => setHoveredAvatar(null)}
                      onClick={() => setSelectedAvatar(a.filename)}
                        aria-pressed={isSelected}
                      aria-label={`בחר ${a.displayName}`}
                        className={`relative w-full aspect-[1/1] p-0 rounded-full transition-transform transform focus:outline-none focus:ring-4 focus:ring-cyan-400/30 overflow-hidden group ${
                          isSelected
                          ? 'scale-105 ring-4 ring-cyan-400/45 shadow-[0_18px_40px_rgba(6,182,212,0.12)] bg-transparent border border-cyan-500'
                          : 'bg-slate-900/40 border border-slate-700 hover:scale-[1.05] hover:shadow-lg'
                        }`}
                    >
                        <div className="absolute inset-0 pointer-events-none rounded-full" />
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-800/50 avatar-wrapper">
                          <img src={`/avatars/${a.filename}`} alt={a.displayName} className={`avatar-img ${posClass}`} />
                        </div>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-cyan-600 text-slate-900 text-[10px] font-black px-2 py-1 rounded-full shadow-lg">נבחר</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hover preview panel - only while hovering over a tile; don't show permanently for selected avatar */}
            {hoveredAvatar && (
              <div className="absolute top-6 right-6 w-44 h-44 bg-slate-900/80 p-2 rounded-xl border border-slate-700 shadow-2xl flex items-center justify-center z-30 pointer-events-none">
                <img
                  src={`/avatars/${hoveredAvatar}`}
                  alt="preview"
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full btn-3d bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black py-4 px-6 rounded-xl text-xl shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-slate-900"
            >
              🚀 בואו נתחיל!
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;