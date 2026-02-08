# 🎯 Quiz Platform

## 📚 About The Project

Welcome to the ultimate **Quiz Platform**, a comprehensive learning ecosystem designed to transform the way students and professionals test their knowledge. Built on the robust **MERN stack**, this application goes beyond simple question-and-answer formats. It integrates powerful gamification mechanics, real-time social competition, and advanced coding challenges to create an engaging, immersive educational experience.

Whether you are an institution looking to host exams, a coding bootcamp assessing student progress, or a community of learners competing for the top spot, this platform provides the tools to track progress, visualize growth, and make learning fun.

## ✨ Key Features

### 🎮 Gamified Learning Ecosystem
Learning shouldn't be boring. We've built a system that rewards consistency and mastery.
- **Interactive Quizzes**: Support for multiple formats including multiple-choice, true/false, and code-based questions.
- **Multi-Line Questions**: **New!** Questions now support multi-line text formatting, perfect for code examples and complex scenarios.
- **Image Support**: **New!** Attach images to questions for visual context, diagrams, and code screenshots.
- **Blockly Integration**: **New!** A drag-and-drop coding interface that allows users to solve logic puzzles visually, with semantic grading that understands the *logic* of the code.
- **XP & Leveling**: Earn Experience Points (XP) for every correct answer, leveling up to unlock prestige and new features.
- **Dynamic Shop**: A virtual economy where users spend earned currency on power-ups (e.g., "50/50", "Time Freeze"), cosmetic avatars, and badges.
- **Daily Challenges**: Unique, time-limited quizzes generated daily to keep engagement high.

### 📝 Question Enhancement Features
Create richer, more engaging quiz questions with our new features:
- **Multi-Line Text Support**: 
  - Questions can span multiple lines for better readability
  - Perfect for code snippets, mathematical expressions, and detailed scenarios
  - Preserves formatting with proper line breaks
  - Example:
    ```
    What prints after the following code:
    val = input('Num: ') (user types 5)
    then print(val * 3)?
    ```

- **Image Attachments**:
  - Add visual context to questions with image URLs
  - Supports all standard image formats (PNG, JPG, GIF, WebP)
  - Automatic preview in the admin panel
  - Responsive display on all devices
  - Example use cases:
    - Code output screenshots
    - Data structure diagrams
    - UI/UX mockups
    - Mathematical graphs
    - Algorithm flowcharts


### 🤝 Social & Competitive Hub
Knowledge is better shared. Our social suite connects learners.
- **Friends System**: Search for users, send friend requests, and build your learning network.
- **Live Battles (VS Mode)**: Real-time 1v1 competitive quizzes powered by WebSockets. Challenge friends or match with random opponents.
- **Clans & Communities**: Join forces to create Clans. Compete in exclusive Clan Leaderboards.
- **Global Leaderboards**: Track ranking globally, among friends, or within your clan.

### 🛡️ Enterprise-Grade Security
Built with security first to protect data and privacy.
- **Secure Authentication**: Robust JWT-based authentication with bcrypt hashing.
- **Advanced Protection**: XSS sanitization, rate limiting, and HTTP parameter pollution protection.
- **Role-Based Access Control (RBAC)**: Distinct secure environments for Students and Admins.

### 🛠️ Powerful Admin Dashboard
Complete control over the platform's content and users.
- **Analytics Suite**: Visual graphs showing user growth, completion rates, and scores.
- **User Management**: Administrators can view, edit, or ban users as needed.
- **Content CMS**: Built-in tools to create and manage Shop Items, Quizzes, and Daily Challenges.

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn
- MongoDB Instance (Local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
  cd "Quiz Platform"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # App Config
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/quiz-platform
   
   # Security
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=30d

  # Client / Server URLs
  CLIENT_URL=http://localhost:5173
  VITE_API_URL=http://localhost:5000/api
  VITE_SOCKET_URL=http://localhost:5000
  VITE_ENABLE_SOCKET=true

  # AI (optional)
  GROQ_API_KEY=your_groq_api_key
   
   # Optional: Supabase (Legacy/Hybrid support)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. **Run development server**
   This enables concurrent execution of both the Client (Vite) and Server (Node/Express).
   ```bash
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:5000

  Or run them separately:
  ```bash
  npm run client
  npm run server
  ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📦 Project Structure

```
Quiz Platform/
├── api/                  # Serverless API (Vercel/Netlify)
├── netlify/functions/    # Netlify Functions entry
├── public/               # Static assets & Legacy JSON quizzes
├── scripts/              # Build/maintenance scripts
├── server/               # Backend Logic (Express + Mongoose)
│   ├── controllers/      # Route logic (Auth, Users, Shop, etc.)
│   ├── middleware/       # Auth, Error handling, Security
│   ├── models/           # Mongoose Schemas (User, Attempt, Clan)
│   └── routes/           # API Routes
├── src/                  # Frontend Logic (React + Vite)
│   ├── components/       # Reusable UI Components
│   ├── pages/            # Main Application Pages
│   ├── context/          # Global State (Auth, Theme, Notifications)
│   └── lib/              # Utilities & Third-party configs
├── uploads/              # Uploaded files (local dev)
├── .env                  # Environment variables
└── package.json
```

## 🛠️ Technologies Used

### Frontend
- **React 19** - Latest UI features
- **TypeScript** - Strict type safety
- **Tailwind CSS v4** - Modern, utility-first styling
- **Vite** - Lightning-fast tooling
- **Blockly** - Visual programming editor
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js & Express** - Robust server architecture
- **MongoDB & Mongoose** - Flexible data modeling
- **Socket.io** - WebSocket server for VS mode
- **Bcrypt & JWT** - Industrial-grade security

## 🚀 Production Deployment

This project is optimized for a split-deployment: **Frontend on Vercel** and **Backend on Koyeb**.

### 1. Backend (Koyeb)
- **Deployment**: Connect your GitHub repository and point to the `server/index.js` as the entry point.
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `MONGODB_URI`: Your MongoDB Atlas connection string.
  - `JWT_SECRET`: A long, random string.
  - `PORT`: `5000` (or as provided by Koyeb).
  - `CLIENT_URL`: `https://your-app-name.vercel.app` (Your Vercel frontend URL).
  - `GROQ_API_KEY`: Your Groq API key (for AI quiz generation).

### 2. Frontend (Vercel)
- **Deployment**: Select the root directory. Vercel will automatically detect Vite.
- **Build Settings**:
  - **Framework Preset**: `Vite`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://your-koyeb-app.koyeb.app/api`
  - `VITE_SOCKET_URL`: `https://your-koyeb-app.koyeb.app`
  - `VITE_ENABLE_SOCKET`: `true`

---

## 📄 License

MIT License - feel free to use this project for your own purposes!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for education and learning
