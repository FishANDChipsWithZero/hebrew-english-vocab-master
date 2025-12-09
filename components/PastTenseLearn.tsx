import React, { useState } from 'react';
import BackButton from './BackButton';

interface PastTenseLearnProps {
  onBack: () => void;
  onBackToSettings?: () => void;
}

const PastTenseLearn: React.FC<PastTenseLearnProps> = ({ onBack, onBackToSettings }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const infographics = [
    {
      title: 'Past Simple',
      image: '/infographics/past_simple.png',
      description: 'מתי משתמשים ב-Past Simple'
    },
    {
      title: 'Past Progressive',
      image: '/infographics/past_progressive.png',
      description: 'מתי משתמשים ב-Past Progressive'
    },
    {
      title: 'ההבדל בין השניים',
      image: '/infographics/past_diff.png',
      description: 'Past Simple לעומת Past Progressive'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % infographics.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + infographics.length) % infographics.length);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 animate-slide-up flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700 neon-border flex flex-col h-full">
        {/* Header with Two Back Buttons */}
        <div className="relative p-3 sm:p-6 pb-3 sm:pb-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-center text-white neon-text-glow pr-32 sm:pr-44">
            📚 לימוד Past Simple / Progressive
          </h2>
          <div className="absolute top-3 sm:top-6 right-3 sm:right-6 flex gap-2">
            <BackButton onClick={onBackToSettings} small>
              הגדרות
            </BackButton>
            <BackButton onClick={onBack} small>
              תרגולים
            </BackButton>
          </div>
        </div>

        {/* Scrollable Infographic Display */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400 text-center mb-3 sm:mb-4">
            {infographics[currentSlide].title}
          </h3>
          
          {/* Image Container - Full height with scroll, clickable to zoom */}
          <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 mb-3 sm:mb-4 cursor-pointer hover:bg-gray-50 transition-colors relative group"
               onClick={() => setIsZoomed(true)}>
            <img
              src={infographics[currentSlide].image}
              alt={infographics[currentSlide].title}
              className="w-full h-auto max-w-full rounded-lg shadow-lg mx-auto block"
              onError={(e) => {
                // Fallback if image doesn't exist
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23334155" width="400" height="300"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="20" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E%D7%94%D7%95%D7%A1%D7%A3 %D7%90%D7%AA %D7%94%D7%90%D7%99%D7%A0%D7%A4%D7%95%D7%92%D7%A8%D7%A4%D7%99%D7%A7%D7%94 %D7%9B%D7%90%D7%9F%3C/text%3E%3C/svg%3E';
              }}
            />
            {/* Zoom hint - icon only on mobile, text on desktop */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-yellow-600/90 text-slate-900 px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-lg">
              <span className="sm:hidden">🔍</span>
              <span className="hidden sm:inline">🔍 לחץ להגדלה</span>
            </div>
          </div>

          {/* Zoomed Image Modal */}
          {isZoomed && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out overflow-auto"
              onClick={() => setIsZoomed(false)}
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={infographics[currentSlide].image}
                  alt={infographics[currentSlide].title}
                  className="max-w-full max-h-full object-contain"
                  style={{ touchAction: 'pinch-zoom' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button 
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white text-black font-bold px-4 py-2 rounded-lg shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                  }}
                >
                  ✕ סגור
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 rounded-xl p-3 sm:p-4 mt-3">
            <p className="text-slate-300 text-center text-sm sm:text-base md:text-lg">
              {infographics[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-slate-700 p-3 sm:p-6 pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <button
            onClick={prevSlide}
            className="btn-3d bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
          >
            <span className="hidden sm:inline">← הקודם</span>
            <span className="sm:hidden">←</span>
          </button>

          {/* Slide Indicators */}
          <div className="flex gap-1 sm:gap-2">
            {infographics.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                aria-label={`עבור לשקופית ${index + 1}`}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                  currentSlide === index
                    ? 'bg-yellow-400 w-6 sm:w-8'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="btn-3d bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
          >
            <span className="hidden sm:inline">הבא →</span>
            <span className="sm:hidden">→</span>
          </button>
        </div>

        {/* Slide Counter */}
        <div className="text-center text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
          {currentSlide + 1} / {infographics.length}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <p className="text-yellow-300 text-xs sm:text-sm font-bold mb-1 sm:mb-2">💡 עצה</p>
          <p className="text-slate-300 text-xs sm:text-sm">
            לאחר לימוד החומר, חזור לדף הבחירה ובחר "Past Simple / Progressive - תרגול" כדי לתרגל את מה שלמדת!
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PastTenseLearn;
