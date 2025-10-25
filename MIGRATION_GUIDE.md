# Migration from Supabase to Firebase + Next.js

## Overview
This project has been migrated from:
- **Vite + React** → **Next.js 14**
- **Supabase** → **Firebase (Auth + Firestore)**
- **Local dev server** → **Vercel deployment**

## Prerequisites
1. Node.js 18+ installed
2. Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
3. Vercel account (optional, for deployment)

## Setup Instructions

### 1. Clean Installation
```bash
# Remove old node_modules and lock file
rm -rf node_modules package-lock.json

# Install new dependencies
npm install
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication** > Email/Password provider
4. Enable **Firestore Database** in test mode (or production mode with security rules)
5. Get your Firebase config from Project Settings > General > Your apps

### 3. Environment Variables

Create `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore Security Rules

In Firebase Console > Firestore Database > Rules, use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /database_connections/{connectionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    match /api_endpoints/{endpointId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    match /api_usage/{usageId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    match /subscriptions/{subscriptionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### Option 1: Automatic (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect Next.js
6. Add your environment variables in the Vercel dashboard
7. Deploy!

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production deployment
vercel --prod
```

## Key Changes

### Authentication
- **Old:** Supabase Auth with `supabase.auth.signInWithPassword()`
- **New:** Firebase Auth with `signInWithEmailAndPassword()`

### Database Operations
- **Old:** Supabase tables with SQL
- **New:** Firestore collections with NoSQL

### Service Layer
- **Old:** `SupabaseService` in `src/utils/supabase-service.ts`
- **New:** `FirebaseService` in `src/services/firebaseService.ts`

### Routing
- **Old:** React Router with `react-router-dom`
- **New:** Next.js App Router with file-based routing

### File Structure
```
src/
├── app/              # Next.js pages (file-based routing)
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   ├── login/
│   ├── signup/
│   ├── dashboard/
│   └── ...
├── components/       # React components (unchanged)
├── contexts/         # React contexts (new AuthContext)
├── lib/             # Configuration files
│   └── firebaseConfig.ts
├── services/        # Business logic
│   └── firebaseService.ts
└── utils/           # Utilities
```

## Data Migration

If you have existing data in Supabase, you'll need to manually migrate it:

1. Export data from Supabase (SQL dumps or API)
2. Transform to Firestore format
3. Import using Firebase Admin SDK or console

## Troubleshooting

### "Cannot find module 'next'"
Run `npm install` to install all dependencies.

### "Firebase not initialized"
Check your `.env.local` file has all required variables.

### "Permission denied" in Firestore
Update your Firestore security rules (see step 4 above).

### Build errors
Delete `.next` folder and `node_modules`, then reinstall:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Files Removed
- `src/lib/supabase.ts`
- `src/utils/supabase-service.ts`
- `src/components/auth/AuthGuard.tsx` (replaced with AuthContext)
- `supabase/` directory
- Vite configuration files
- Old `.env.example` (replaced with `.env.local.example`)

## Support
For issues, check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
