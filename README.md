# 🚚 ParleyFlow

**ParleyFlow** is a lightweight delivery collection management app built for daily route-based billing operations.  
It helps admins upload delivery sheets, assign bills to delivery persons, track payment collection, support offline updates, and export professional payment reports.

<p align="center">
  <b>React + Supabase + Capacitor Android + Electron Windows</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Mobile-Capacitor-119EFF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Desktop-Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" />
</p>

---

## ✨ Overview

ParleyFlow was designed for a real-world delivery operation where admins manage daily billing sheets and delivery persons collect payments on assigned routes.

The app works directly with **Supabase** and does not require a custom backend server.

```txt
Admin / Operator App
        ↓
Supabase Auth
        ↓
Supabase Database + RLS
        ↓
IndexedDB Offline Cache
        ↓
Android APK / Windows EXE
````

---

## 🔥 Key Features

### 👨‍💼 Admin

* Upload daily bill sheets
* Assign bills to delivery persons
* View dashboard summary
* View active routes
* View delivery persons
* Clear route/operator operational data
* Export payment collection report
* Export includes totals for:

  * Bill Amount
  * Cash
  * Online
  * Cheque
  * Cash Pending
  * Difference
  * Cancelled count

### 🚴 Delivery Person / Operator

* Login securely
* View assigned route
* View assigned bills
* Search bills
* Save payment collection
* Add remarks
* Mark cancelled bills
* Work offline
* Sync pending updates when internet returns

### 📶 Offline Support

ParleyFlow supports offline-first operator workflows.

```txt
No internet
   ↓
Payment saved locally in IndexedDB
   ↓
Internet returns
   ↓
Pending updates sync to Supabase
```

This is useful for delivery persons working in areas with unstable mobile network.

---

## 🧱 Tech Stack

| Layer           | Technology        |
| --------------- | ----------------- |
| Frontend        | React + Vite      |
| Styling         | Tailwind CSS      |
| Database        | Supabase Postgres |
| Authentication  | Supabase Auth     |
| Security        | Supabase RLS      |
| Offline Storage | IndexedDB         |
| Android App     | Capacitor         |
| Windows App     | Electron          |
| Excel Export    | SheetJS / xlsx    |

---

## 📁 Project Structure

```txt
ParleyFlow/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── supabaseApi.js
│   │   ├── components/
│   │   ├── hooks/
│   │   │   ├── useIndexedDB.js
│   │   │   └── useOffline.js
│   │   ├── lib/
│   │   │   └── supabaseClient.js
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── operator/
│   │   └── utils/
│   ├── android/
│   ├── electron/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── capacitor.config.ts
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── README.md
└── .gitignore
```

---

## ⚙️ Environment Variables

Create this file:

```txt
frontend/.env
```

Add:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_publishable_key
VITE_LOGIN_EMAIL_DOMAIN=parley.com
```

Example operator login:

```txt
Username: operator1
Actual email used: operator1@parley.com
```

> Never place `SUPABASE_SERVICE_ROLE_KEY` inside the frontend.

---

## 🚀 Run Locally

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

---

## 🏗️ Production Build

```bash
cd frontend
npm run build
```

Build output:

```txt
frontend/dist/
```

---

## 📱 Android APK Build

ParleyFlow supports Android using Capacitor.

### Build and sync

```bash
cd frontend
npm run build
npx cap sync android
```

### Build debug APK

```bash
cd frontend/android
./gradlew assembleDebug
```

APK output:

```txt
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on phone

```bash
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🖥️ Windows Desktop App

ParleyFlow also supports Windows desktop using Electron.

### Run Electron in development

```bash
cd frontend
npm run electron:dev
```

### Build Windows installer

```bash
cd frontend
npm run dist:win
```

Output:

```txt
frontend/release/
```

> Do not commit `.exe`, `.msi`, or `release/` files to GitHub.
> Upload installers under GitHub Releases instead.

---

## 🗄️ Supabase Setup

Required core tables:

```txt
profiles
routes
bills
daily_batches
operator_updates
```

Important rule:

```txt
profiles.id must match auth.users.id
```

For delivery persons:

1. Create user in Supabase Authentication.
2. Copy the Auth user UUID.
3. Insert/update matching row in `public.profiles`.

Example:

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

Deactivate operator:

```sql
update public.profiles
set active = false
where username = 'operator1';
```

Activate operator:

```sql
update public.profiles
set active = true
where username = 'operator1';
```

---

## 🔐 Security Notes

ParleyFlow uses Supabase Row Level Security.

Recommended checks:

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Important tables should have RLS enabled:

```txt
profiles
routes
bills
daily_batches
operator_updates
```

Frontend must not contain:

```txt
SUPABASE_SERVICE_ROLE_KEY
API_URL
VITE_API_URL
FastAPI backend URL
hardcoded passwords
```

Security design:

```txt
UI permissions are not trusted.
Supabase RLS decides real access.
Operators can only access their own assigned data.
Admins can manage operational data.
```

---

## 📊 Export Report

The payment collection export includes:

```txt
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

The report also includes a total row for:

```txt
Bill Amount
Cash
Online
Cheq
Cash Pending
Difference
Cancelled Count
```

---

## 🧪 Testing Checklist

Before using in production:

* [ ] Admin login works
* [ ] Operator login works
* [ ] Operator bills load correctly
* [ ] Assigned route shows correct delivery person
* [ ] Online payment save works
* [ ] Offline payment save works
* [ ] Pending updates sync after reconnect
* [ ] Upload sheet works
* [ ] Export report works
* [ ] Android APK works without backend
* [ ] Windows app works without backend
* [ ] No service role key in frontend
* [ ] RLS is enabled on all important tables

---

## 🧹 Git Ignore Notes

Do not push generated files:

```txt
frontend/node_modules/
frontend/dist/
frontend/release/
frontend/out/
frontend/android/app/build/
*.exe
*.msi
*.apk
*.aab
*.jks
*.keystore
frontend/.env
```

Push source code only.

---

## 👨‍💻 Developer

Developed by **Nachiket** with ❤️

* GitHub: [potterheadk](https://github.com/potterheadk)
* LinkedIn: [Nachiket Kulkarni](https://www.linkedin.com/in/nachiket-kulkarni-362a54266/)

---

## 📌 Project Status

ParleyFlow is built for real operational use with:

```txt
No custom backend
No Railway/Render dependency
Direct Supabase connection
Android APK support
Windows EXE support
Offline operator workflow
```

---

## 📄 License

This project is currently private/internal.
Will add license later.

```
```
