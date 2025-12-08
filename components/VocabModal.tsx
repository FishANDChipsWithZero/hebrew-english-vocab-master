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
    <div className="vocab-modal-overlay" role="dialog" aria-modal="true">
      <div className="vocab-modal-content">
        <div className="vocab-modal-header">
          <div>
            <h2 className="text-lg font-extrabold hebrew-text">אוצר המילים</h2>
            <div className="text-xs text-slate-400 hebrew-text">גלול למטה כדי לראות את כל הקבוצות</div>
          </div>
          <div>
            <BackButton onClick={onClose} small>סגור</BackButton>
          </div>
        </div>

        <div className="vocab-modal-body">
          {groups.map((g, gi) => (
            <div key={gi} className="vocab-group">
              <h3 className="hebrew-text">{g.title}</h3>
              <div className="text-sm text-slate-300 mb-2 hebrew-text">{g.desc}</div>
              <div className="vocab-list">
                {g.items.map(([eng, heb], idx) => (
                  <div key={idx} className="vocab-item">
                    <div className="eng" dir="ltr">{eng}</div>
                    <div className="ml-auto heb" dir="rtl">{heb}</div>
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
