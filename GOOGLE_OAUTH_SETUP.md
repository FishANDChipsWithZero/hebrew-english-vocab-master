# הגדרת Google OAuth לפרויקט

## מה עשינו עד כה

הפרויקט שלך כבר מכיל את כל הקוד הדרוש ל-Google OAuth:
- ✅ רכיב Login עם כפתור Google
- ✅ AuthContext לניהול מצב המשתמש
- ✅ GoogleOAuthProvider מוגדר ב-index.tsx
- ✅ ספריות נדרשות מותקנות (@react-oauth/google, jwt-decode)

**מה שחסר:** רק ה-Client ID מ-Google Cloud Console

---

## שלבים להגדרת Google OAuth

### שלב 1: יצירת פרויקט ב-Google Cloud Console

1. **גש ל-[Google Cloud Console](https://console.cloud.google.com/)**
   - התחבר עם חשבון Google שלך

2. **צור פרויקט חדש:**
   - לחץ על רשימת הפרויקטים בחלק העליון
   - לחץ "New Project"
   - תן שם לפרויקט: `Hebrew English Vocab` (או כל שם אחר)
   - לחץ "Create"
   - המתן מספר שניות עד שהפרויקט ייווצר
   - ודא שהפרויקט החדש נבחר (בחלק העליון)

---

### שלב 2: הגדרת OAuth Consent Screen

1. **לך ל-"APIs & Services" > "OAuth consent screen"**
   - מהתפריט הצדדי: APIs & Services → OAuth consent screen

2. **בחר סוג משתמש:**
   - בחר **"External"** (אלא אם יש לך Google Workspace)
   - לחץ "Create"

3. **מלא את פרטי האפליקציה:**
   - **App name:** `Hebrew English Vocab` (או השם שבחרת)
   - **User support email:** כתובת המייל שלך
   - **App logo:** (אופציונלי - אפשר לדלג)
   - **Developer contact information:** כתובת המייל שלך
   - לחץ "Save and Continue"

4. **Scopes (הרשאות):**
   - לחץ "Save and Continue" (לא צריך להוסיף scopes נוספים)

5. **Test users (משתמשי בדיקה):**
   - אם האפליקציה במצב Testing, הוסף את כתובת המייל שלך
   - לחץ "Add Users" → הזן את המייל → "Add"
   - לחץ "Save and Continue"

6. **סיכום:**
   - בדוק את הפרטים
   - לחץ "Back to Dashboard"

---

### שלב 3: יצירת OAuth Client ID

1. **לך ל-"APIs & Services" > "Credentials"**
   - מהתפריט הצדדי: APIs & Services → Credentials

2. **צור Credentials:**
   - לחץ "+ Create Credentials" בחלק העליון
   - בחר **"OAuth client ID"**

3. **הגדר את סוג האפליקציה:**
   - **Application type:** בחר **"Web application"**
   - **Name:** `Hebrew English Vocab Web Client` (או כל שם)

4. **הוסף Authorized JavaScript origins:**
   - לחץ "+ Add URI" תחת "Authorized JavaScript origins"
   - הוסף את הכתובות הבאות (כל אחת בנפרד):
   ```
   http://localhost:5173
   ```
   ```
   http://localhost:3000
   ```
   
   > **הערה:** אם תעלה את האתר לאינטרנט, תצטרך להוסיף גם את הכתובת שם (למשל: https://yourapp.vercel.app)

5. **Authorized redirect URIs:**
   - לא צריך להוסיף כלום כאן (React OAuth עובד עם JavaScript origins)

6. **צור את ה-Client:**
   - לחץ "Create"
   - תקפוץ חלונית עם **Client ID** ו-**Client Secret**
   - **העתק את ה-Client ID** (זה המפתח הארוך שמסתיים ב-.apps.googleusercontent.com)
   - לחץ "OK"

---

### שלב 4: הוספת Client ID לפרויקט

1. **פתח את הקובץ `.env`** בשורש הפרויקט

2. **החלף את הטקסט `YOUR_GOOGLE_CLIENT_ID_HERE`** ב-Client ID שהעתקת:
   ```env
   VITE_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

3. **שמור את הקובץ**

---

### שלב 5: הפעלת השרת

1. **הפעל מחדש את שרת הפיתוח:**
   ```bash
   npm run dev
   ```

2. **פתח את הדפדפן:**
   - גש ל-http://localhost:5173
   - אמור להופיע כפתור "Sign in with Google"

3. **לחץ על הכפתור והתחבר:**
   - בחר חשבון Google
   - אשר את ההרשאות
   - אמורה להופיע האפליקציה עם הפרופיל שלך

---

## פתרון בעיות נפוצות

### ❌ "Invalid Client ID"
- ודא שהעתקת את ה-Client ID המלא והנכון
- ודא שאין רווחים בתחילת או בסוף המפתח בקובץ .env
- הפעל מחדש את השרת (npm run dev)

### ❌ "redirect_uri_mismatch"
- ודא שהוספת את http://localhost:5173 ב-"Authorized JavaScript origins"
- לא צריך להוסיף redirect URIs
- המתן מספר דקות אחרי השינוי (Google צריכה זמן לעדכן)

### ❌ "Access blocked: This app's request is invalid"
- ודא שהגדרת את OAuth Consent Screen
- ודא שהוספת את המייל שלך ל-Test Users (אם האפליקציה במצב Testing)

### ❌ הכפתור לא מופיע
- בדוק את הקונסול בדפדפן (F12 → Console)
- ודא ש-Client ID מוגדר נכון
- הפעל מחדש את השרת

---

## מידע נוסף

### 🔒 אבטחה
- קובץ ה-.env כבר מוגדר ב-.gitignore ולא יישלח ל-Git
- Client ID הוא ציבורי ולא סודי (בניגוד ל-Client Secret)
- אבל עדיין כדאי לא לפרסם אותו באופן פומבי

### 🌐 העלאה לאינטרנט (Vercel/Netlify)
כשתעלה את האפליקציה לאינטרנט:

1. **ב-Google Cloud Console:**
   - חזור ל-Credentials → ערוך את ה-OAuth client
   - הוסף את כתובת האתר החיצוני ל-"Authorized JavaScript origins"
   - לדוגמה: `https://yourapp.vercel.app`

2. **ב-Vercel/Netlify:**
   - הוסף Environment Variable:
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: (ה-Client ID שלך)

3. **פרסום האפליקציה:**
   - אם האפליקציה במצב Testing, רק משתמשי בדיקה יוכלו להתחבר
   - לפרסום מלא: לך ל-OAuth consent screen → לחץ "Publish App"

---

## סיכום

הפרויקט מוכן לחלוטין! רק צריך:
1. ✅ ליצור Client ID ב-Google Cloud Console
2. ✅ להעתיק אותו לקובץ .env
3. ✅ להפעיל את השרת (`npm run dev`)

**זהו! Google OAuth אמור לעבוד** 🎉

אם יש בעיות, בדוק את פתרון הבעיות למעלה או שלח לי את השגיאה מהקונסול.
