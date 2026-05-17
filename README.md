# ParleyFlow

**ParleyFlow** is a delivery payment collection and route management application built with **React**, **Vite**, **Capacitor Android**, **Supabase**, and **IndexedDB**.

It is designed for small delivery operations where admins upload bill sheets, delivery persons collect payment updates, and the app continues working even when internet is temporarily unavailable.

<p align="center">
  <strong>Developed by Nachiket with ❤️</strong><br />
  <a href="https://github.com/potterheadk">GitHub</a> ·
  <a href="https://www.linkedin.com/in/nachiket-kulkarni-362a54266/">LinkedIn</a>
</p>

---

## Features

### Admin

- Admin login using Supabase Auth
- Dashboard for routes, operators, and bill statistics
- Upload bill sheets
- Manage route/bill operational data
- View delivery persons
- Export payment collection reports as Excel
- Android-compatible Excel export using Capacitor file/share support

### Delivery Person / Operator

- Operator login using Supabase Auth
- View assigned bills only
- Search assigned bills
- Open bill details
- Save payment collection updates
- Supports cash, online, cheque, and cash pending amounts
- Supports cancellation remarks and notes
- Offline update queue using IndexedDB
- Syncs pending updates to Supabase when internet returns

### Offline Support

- Bills are cached locally in IndexedDB
- Payment updates can be saved offline
- Pending updates sync automatically or manually after reconnection
- Each phone/device keeps its own local offline queue

---

## Tech Stack

- **Frontend:** React + Vite
- **Mobile:** Capacitor Android
- **Backend-as-a-Service:** Supabase
- **Database:** Supabase Postgres
- **Authentication:** Supabase Auth
- **Authorization:** Supabase Row Level Security
- **Offline Storage:** IndexedDB
- **Excel Import/Export:** `xlsx`
- **Android File Export:** `@capacitor/filesystem`, `@capacitor/share`
- **Styling:** Tailwind CSS

---

## Current Architecture

```text
React / Capacitor Android App
        ↓
Supabase Auth
        ↓
Supabase Postgres + RLS
        ↓
IndexedDB offline cache and pending sync queue
        ↓
Supabase Edge Functions for privileged operations, if needed
```

The app does **not** require a FastAPI/SQLite backend anymore.

---

## Project Structure

```text
frontend/
├── android/                    # Capacitor Android project
├── public/                     # Manifest, icons, public assets
├── src/
│   ├── api/
│   │   └── supabaseApi.js      # Supabase data access and export logic
│   ├── components/
│   │   ├── AppSignature.jsx
│   │   ├── SyncStatus.jsx
│   │   └── ui/
│   │       └── PaymentCollectionModal.jsx
│   ├── hooks/
│   │   ├── useIndexedDB.js
│   │   └── useOffline.js
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── pages/
│   │   ├── admin/
│   │   ├── operator/
│   │   └── LoginPage.jsx
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   ├── loginEmail.js
│   │   └── uuid.js
│   ├── App.jsx
│   └── main.jsx
├── capacitor.config.ts
├── package.json
└── vite.config.js

supabase/
├── functions/
│   └── operator-admin/
└── migrations/
```

---

## Environment Variables

Create this file:

```text
frontend/.env
```

Example:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
VITE_LOGIN_EMAIL_DOMAIN=father-parley.local
```

Do **not** put the Supabase `service_role` key in the frontend.

Frontend-safe keys only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_LOGIN_EMAIL_DOMAIN
```

Server/Edge Function only:

```text
SUPABASE_SERVICE_ROLE_KEY
```

---

## Supabase Setup

### Required Tables

The app expects these Supabase tables:

```text
profiles
routes
bills
daily_batches
operator_updates
```

Row Level Security should be enabled on all public operational tables.

Check RLS status:

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected important tables:

```text
profiles                true
routes                  true
bills                   true
daily_batches           true
operator_updates        true
```

---

## User Management

Delivery persons are managed from the Supabase Dashboard.

### Create Delivery Person

1. Go to:

```text
Supabase Dashboard → Authentication → Users → Add user
```

2. Create a user with an email such as:

```text
operator1@father-parley.local
```

3. Set a password.

4. Copy the created Auth user UUID.

5. Insert or update the matching profile row:

```sql
insert into public.profiles (
  id,
  username,
  full_name,
  role,
  active
)
values (
  'AUTH_USER_UUID_HERE',
  'operator1',
  'Operator 1',
  'operator',
  true
)
on conflict (id) do update
set
  username = excluded.username,
  full_name = excluded.full_name,
  role = excluded.role,
  active = excluded.active;
```

Important:

```text
public.profiles.id must exactly match auth.users.id
```

### Deactivate Delivery Person

```sql
update public.profiles
set active = false
where username = 'operator1';
```

### Reactivate Delivery Person

```sql
update public.profiles
set active = true
where username = 'operator1';
```

### Reset Password

Use:

```text
Supabase Dashboard → Authentication → Users → Select User → Update Password
```

Do not reset passwords through SQL.

---

## Local Development

Install dependencies:

```bash
cd frontend
npm install
```

Start dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Build production frontend:

```bash
npm run build
```

---

## Android APK Build

Install dependencies:

```bash
cd frontend
npm install
```

Build Vite project:

```bash
npm run build
```

Sync Capacitor Android project:

```bash
npx cap sync android
```

Build debug APK:

```bash
cd android
./gradlew assembleDebug
```

APK output:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Install on connected Android phone:

```bash
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Required Capacitor Plugins

This project uses Capacitor 6.

Install compatible plugin versions only:

```bash
cd frontend
npm install @capacitor/filesystem@6 @capacitor/share@6
```

Do not install Capacitor 8 plugins unless the whole project is upgraded to Capacitor 8.

---

## Export Reports

The payment collection export generates an Excel file with these columns:

```text
Sr/No
Bill No
Bill Date
Retailer Name
Bill Amount
Cash
Online
Cheq
Cash Pending
Cancel
Remarks
Difference
```

The export includes totals for:

```text
Bill Amount
Cash
Online
Cheq
Cash Pending
Difference
```

Difference calculation:

```text
Difference = Bill Amount - Cash - Online - Cheq
```

Cash Pending is shown separately and is not subtracted from Difference unless business logic is changed later.

On Android, export uses Capacitor file/share support instead of normal browser-only download behavior.

---

## Offline Sync Flow

```text
Operator opens app online
        ↓
Bills load from Supabase
        ↓
Bills are saved to IndexedDB
        ↓
Operator goes offline
        ↓
App loads cached bills from IndexedDB
        ↓
Operator saves payment update
        ↓
Update is saved to IndexedDB pending_updates
        ↓
Internet returns
        ↓
Pending updates sync to Supabase
        ↓
Successfully synced updates are removed from local queue
```

---

## Security Checklist

Before production use, verify:

```text
No service_role key in frontend
No FastAPI/backend API URL in frontend
No axios/API_URL dependency
RLS enabled on all public operational tables
Operators can read only their assigned bills
Operators cannot insert updates for other operators' bills
Admins are verified through profiles role = admin and active = true
Android cleartext HTTP is not enabled
Android backup is disabled if local data should not be backed up
```

Recommended Android setting:

```xml
android:allowBackup="false"
```

Final frontend scan:

```bash
grep -RIn "service_role\|SUPABASE_SERVICE\|axios\|API_URL\|VITE_API_URL\|localhost:8000\|127.0.0.1:8000\|/sync/" frontend \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=android
```

Expected result:

```text
no output
```

---

## Testing Checklist

### Admin

```text
Admin login works
Dashboard loads
Routes display correctly
Delivery persons list displays
Upload sheet works
Export Excel works
Export includes total row
```

### Operator

```text
Operator login works
Assigned bills load
Bill details open
Payment save works online
Payment save works offline
Pending updates sync after reconnect
Operator cannot see another operator's bills
```

### Android APK

```text
APK installs successfully
Login works on phone
Supabase requests work without local backend
Offline cache works after app restart
Export/share works on Android
No repeated PWA update popups
```

---

## Common Commands

Build and sync Android after frontend changes:

```bash
cd frontend
npm run build
npx cap sync android
```

Build debug APK:

```bash
cd frontend/android
./gradlew assembleDebug
```

Install APK:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Check for old backend references:

```bash
grep -RIn "axios\|API_URL\|VITE_API_URL\|localhost:8000\|127.0.0.1:8000\|/sync/" frontend \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=android
```

---

## Notes

- `VITE_SUPABASE_ANON_KEY` or Supabase publishable key is safe for frontend use.
- `SUPABASE_SERVICE_ROLE_KEY` must never be added to frontend code or APK.
- Do not run `npm audit fix --force` blindly because it can break Capacitor/Vite dependency compatibility.
- If updating Capacitor, update all Capacitor packages together.
- For Capacitor 6, use Capacitor 6 plugin versions.

---

## License

This project is currently private/internal.Will add licence later.

---

## Developer

Developed by **Nachiket** with ❤️

- GitHub: https://github.com/potterheadk
- LinkedIn: https://www.linkedin.com/in/nachiket-kulkarni-362a54266/
