import React from 'react';
import BackButton from './BackButton';

interface VocabModalProps {
  open: boolean;
  onClose: () => void;
}

const groups = [
  {
    title: 'קבוצה 1: רגשות, יחסים ואינטראקציות חברתיות',
    desc: 'קבוצה זו מתמקדת במה שאנחנו מרגישים ואיך אנחנו מתקשרים עם אחרים.',
    items: [
      ['afraid','מפחד'],
      ['apologize','להתנצל'],
      ['appreciate','להעריך'],
      ['behave','להתנהג'],
      ['blame','להאשים'],
      ['emotional','רגשי'],
      ['encourage','לעודד'],
      ['get along with','להסתדר עם'],
      ['hug','חיבוק / לחבק'],
      ['pleased','מרוצה'],
      ['surprise','להפתיע'],
      ['upset','עצוב / כועס'],
      ['be crazy about','"משוגע על"'],
      ['can\'t wait','לא יכול לחכות'],
      ['each other','זה את זה'],
    ]
  },
  {
    title: 'קבוצה 2: בידור, מדיה וטכנולוגיה',
    desc: 'מילים הקשורות לעולם הקולנוע, התיאטרון והאינטרנט.',
    items: [
      ['actor','שחקן'],
      ['camera','מצלמה'],
      ['chat','לשוחח בצ\'אט'],
      ['director','במאי'],
      ['movie theater','קולנוע'],
      ['online','מחובר / באינטרנט'],
      ['play','מחזה'],
      ['record','להקליט'],
      ['stage','במה'],
      ['star','כוכב'],
      ['technology','טכנולוגיה'],
      ['invent','להמציא'],
      ['make up','להמציא (סיפור/תירוץ)'],
      ['sound(s) good','נשמע טוב'],
    ]
  },
  {
    title: 'קבוצה 3: מקומות, נסיעות ולוגיסטיקה',
    desc: 'מילים שימושיות לתיאור התניידות, מקומות וחפצים אישיים.',
    items: [
      ['airport','נמל תעופה'],
      ['gloves','כפפות'],
      ['handbag','תיק יד'],
      ['operate','לפעול / להפעיל'],
      ['police station','תחנת משטרה'],
      ['railway station','תחנת רכבת'],
      ['seaside','שפת הים'],
      ['southern','דרומי'],
      ['swimming pool','בריכת שחייה'],
      ['traffic jam','פקק תנועה'],
      ['book (v)','להזמין (מקום/כרטיס)'],
      ['in time','בזמן'],
      ['pick up','לאסוף'],
    ]
  },
  {
    title: 'קבוצה 4: חברה, תפקידים ומושגים רשמיים',
    desc: 'מילים הקשורות לעולם העבודה, הממשל ונושאים "רציניים" יותר.',
    items: [
      ['achievement','הישג'],
      ['afford','להרשות לעצמך (כלכלית)'],
      ['be responsible for','להיות אחראי ל-'],
      ['contract','חוזה'],
      ['enemy','אויב'],
      ['expert','מומחה'],
      ['hunger','רעב'],
      ['minister','שר (בממשלה)'],
      ['president','נשיא'],
      ['research','מחקר'],
      ['role','תפקיד'],
      ['tax','מס'],
      ['title','כותרת'],
      ['opening','פתיחה (של אירוע/מקום)'],
    ]
  },
  {
    title: 'קבוצה 5: מילות תיאור והעצמה (שמות תואר ותוארי הפועל)',
    desc: 'מילים שעוזרות לנו לתאר דיוק, גודל, תדירות ואופן.',
    items: [
      ['accurate','מדויק'],
      ['actually','למעשה / בעצם'],
      ['basic','בסיסי'],
      ['exactly','בדיוק'],
      ['extremely','באופן קיצוני'],
      ['horrible','נורא'],
      ['huge','ענק'],
      ['minor','שולי / מינורי'],
      ['otherwise','אחרת'],
      ['significant','משמעותי'],
      ['twice','פעמיים'],
      ['even','אפילו'],
      ['a shame','חבל (ביטוי תיאורי)'],
    ]
  },
  {
    title: 'קבוצה 6: פעולות ומושגים כלליים',
    desc: 'קבוצת מילים מגוונת שכוללת פעולות תקשורת ומושגים אבסטרקטיים.',
    items: [
      ['accent','מבטא'],
      ['accompany','ללוות'],
      ['alter','לשנות'],
      ['childhood','ילדות'],
      ['condition','מצב / תנאי'],
      ['contact','ליצור קשר'],
      ['convince','לשכנע'],
      ['detail','פרט'],
      ['doubt','ספק'],
      ['fight','ריב'],
      ['lie','שקר'],
      ['tell','לספר'],
      ['truth','אמת'],
    ]
  }
];

const VocabModal: React.FC<VocabModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${
      open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      {/* Modal Container - Fixed size, internal scroll only */}
      <div className="relative bg-luxury-card backdrop-blur-xl rounded-2xl shadow-2xl border luxury-container w-[95vw] h-[85vh] max-w-4xl flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gold px-4 sm:px-6 py-3 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-black text-gold hebrew-text">מחסן מילים</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-2xl opacity-60 hover:opacity-100 transition-opacity font-bold" title="סגור">×</button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {groups.map((g, gi) => (
            <div key={gi} className="bg-luxury-card border border-gold/30 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gold mb-2 hebrew-text">{g.title}</h3>
              <div className="text-sm text-cream/70 mb-4 hebrew-text">{g.desc}</div>
              <div className="space-y-2">
                {g.items.map(([eng, heb], idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors border border-gold/10">
                    <div className="font-medium text-cream" dir="ltr">{eng}</div>
                    <div className="font-medium text-gold" dir="rtl">{heb}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VocabModal;
