# לוח שנה משפחתי — משפחת אשואל

PWA פרטי ללוח שנה משפחתי עם Google Calendar ומשוב.

## מה כולל

- לוח שנה יומי / שבועי / חודשי (FullCalendar, RTL עברית)
- שיעורי בית, מבחנים, מערכת שעות מ-**משוב**
- אירועים מ-**Google Calendar** (`משפחת אשואל`)
- משימות מקומיות משפחתיות
- אישורי הורים ממשוב
- Web Push notifications
- 3 ילדים, תפקידים: family_admin / parent / child
- PWA — ניתן להתקנה

---

## הגדרת Supabase

1. צור פרויקט ב-[supabase.com](https://supabase.com)
2. SQL Editor → הרץ בסדר:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_seed.sql` (דמו, אופציונלי)
3. Extensions: הפעל `pg_cron` + `pg_net`, אחר כך הרץ `004_cron.sql`
4. Authentication → URL Configuration → הוסף: `https://YOUR_DOMAIN`

---

## Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → פרויקט חדש
2. Enable: **Google Calendar API**
3. OAuth consent screen → External → Scopes: `calendar.events` + `calendar.calendarlist.readonly`
4. Add test user: `ashwalgmail@gmail.com`
5. Credentials → OAuth 2.0 Client ID → Web app
6. Redirect URI: `https://YOUR_DOMAIN/api/integrations/google/callback`

---

## משתני סביבה

```bash
cp .env.example .env.local
# מלא את כל הערכים
```

```bash
# Generate encryption key (64 hex chars):
openssl rand -hex 32

# Generate VAPID keys:
npx web-push generate-vapid-keys
```

---

## הרצה מקומית

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## פריסה ל-Vercel

```bash
vercel --prod
# הגדר env vars ב-Vercel Dashboard
# עדכן GOOGLE_REDIRECT_URI לכתובת הפרודקשן
```

---

## Edge Functions

```bash
npm i -g supabase
supabase login
supabase functions deploy sync-google-calendar --project-ref REF
supabase functions deploy sync-mashov --project-ref REF
supabase functions deploy send-notifications --project-ref REF
supabase functions deploy purge-old-items --project-ref REF
supabase secrets set ENCRYPTION_KEY=... --project-ref REF
supabase secrets set GOOGLE_CLIENT_ID=... --project-ref REF
supabase secrets set GOOGLE_CLIENT_SECRET=... --project-ref REF
```

---

## החלפת Mashov Mock

1. צור `lib/mashov/real-adapter.ts` המממש `MashovAdapter`
2. ב-`app/api/integrations/mashov/sync-now/route.ts`:
   ```ts
   // החלף:
   import { MockMashovAdapter } from '@/lib/mashov/mock-adapter'
   // ב:
   import { RealMashovAdapter } from '@/lib/mashov/real-adapter'
   ```
3. אותו שינוי ב-`supabase/functions/sync-mashov/index.ts`

---

## יצירת משתמשים

Supabase Dashboard → Authentication → Users → Add user:
- הורה 1 (family_admin)
- הורה 2 (parent)
- ילד א' (child)
- ילד ב' (child)

כניסה ראשונה → `/setup` להשלמת פרופיל → `/today`
