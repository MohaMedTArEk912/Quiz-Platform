# Setting Up Supabase for Your Quiz Platform

This guide will help you set up Supabase as a cloud database for your Quiz Platform.

## Why Use Supabase?

By default, your app uses **localStorage** (browser storage), which means:
- ❌ Data is stored only in your browser
- ❌ Data is lost if you clear browser cache
- ❌ Data cannot be shared across devices

With **Supabase**, you get:
- ✅ Cloud storage - data persists across devices
- ✅ Real database with PostgreSQL
- ✅ User data synced across all users
- ✅ Admin dashboard works with real data

---

## Step-by-Step Setup

### 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with GitHub, Google, or email

### 2. Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name**: `quiz-platform` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Select **Free** (perfect for development)
3. Click **"Create new project"**
4. Wait 2-3 minutes for your project to be set up

### 3. Get Your API Credentials

1. In your Supabase project dashboard, click on the **"Settings"** icon (⚙️) in the left sidebar
2. Click **"API"** under Project Settings
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

### 4. Create Database Tables

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste this SQL code:

```sql
-- Create users table
CREATE TABLE users (
  "userId" TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  "totalScore" INTEGER DEFAULT 0,
  "totalAttempts" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attempts table
CREATE TABLE attempts (
  "attemptId" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "quizTitle" TEXT NOT NULL,
  score INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  "timeTaken" INTEGER NOT NULL,
  answers JSONB NOT NULL,
  "completedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES users("userId") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_attempts_userId ON attempts("userId");
CREATE INDEX idx_attempts_completedAt ON attempts("completedAt");
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for development)
-- Note: In production, you should create more restrictive policies
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on attempts" ON attempts
  FOR ALL USING (true) WITH CHECK (true);
```

4. Click **"Run"** (or press `Ctrl+Enter`)
5. You should see "Success. No rows returned" - this is good!

### 5. Configure Your App

1. In your project folder, create a file named `.env` (copy from `.env.example`):
   ```bash
   # On Windows PowerShell
   Copy-Item .env.example .env
   
   # On Mac/Linux
   cp .env.example .env
   ```

2. Open the `.env` file and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart your development server**:
   - Stop the current server (Ctrl+C in terminal)
   - Run `npm run dev` again

### 6. Test Your Setup

1. Open your app at `http://localhost:5173/`
2. Create a new user account
3. Take a quiz
4. Go to Supabase dashboard → **Table Editor** → `users` and `attempts`
5. You should see your data there! 🎉

---

## Troubleshooting

### Error: "Invalid supabaseUrl"
- Make sure your `.env` file has the correct URL format: `https://xxxxxxxxxxxxx.supabase.co`
- Restart your dev server after creating/editing `.env`

### Data not saving to Supabase
- Check browser console for errors
- Verify your API key is correct
- Make sure you ran the SQL commands to create tables
- Check that RLS policies are enabled

### Can't see data in Supabase
- Go to Supabase → **Table Editor**
- Select the `users` or `attempts` table
- Check if RLS policies are properly set

---

## Switching Between localStorage and Supabase

- **To use localStorage**: Delete or rename your `.env` file
- **To use Supabase**: Create `.env` with valid credentials

The app automatically detects which mode to use!

---

## Security Notes

⚠️ **Important for Production:**

1. The current RLS policies allow all operations - this is fine for development
2. For production, create proper policies based on user authentication
3. Never commit your `.env` file to Git (it's already in `.gitignore`)
4. Consider implementing proper authentication with Supabase Auth

---

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- Check the browser console for error messages
