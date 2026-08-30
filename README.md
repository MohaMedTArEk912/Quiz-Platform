# 🎯 Quiz Platform — Next-Gen Gamified Learning & Assessment Ecosystem

[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20TypeScript-61DAFB.svg)](https://reactjs.org/)
[![AI Powered](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3%20%26%20Mixtral-F05A28.svg)](https://groq.com/)
[![Real-Time](https://img.shields.io/badge/Real--Time-WebSockets%20%2F%20Socket.IO-010101.svg)](https://socket.io/)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS%20v4-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📚 Overview

**Quiz Platform** is a full-featured, enterprise-grade learning and assessment ecosystem built on the **MERN stack (MongoDB, Express, React 19, Node.js)** and **TypeScript**. 

It transcends conventional question-and-answer apps by unifying **AI-driven quiz extraction/generation**, **live real-time multiplayer duels**, **interactive code compilation & Blockly visual programming**, **RPG-style skill trees**, **social clans**, and a **deep administrative analytics suite**.

Whether you are an educational institution hosting formal exams, a coding bootcamp tracking student mastery, or a community of competitive learners, this platform delivers unmatched engagement, deep analytics, and gamified motivation.

---

## 🌟 Comprehensive Feature Matrix

### 🧮 1. LaTeX & Rich Mathematical Formula Support
* **KaTeX Rendering Engine**:
  * Seamless mathematical typesetting for inline equations (`$...$`) and multiline block math (`$$...$$`).
  * Live equation previewing in question editor, flashcard decks, attempt inspector, and result reviews.
  * Resilient fallback rendering for complex scientific notations, Greek symbols, matrices, and fractions.

---

### 🛡️ 2. Exam Integrity & Anti-Cheating Telemetry
* **Enforced Fullscreen Lock**:
  * Proctored exam mode requires fullscreen locking before commencing.
  * Real-time penalty deductions and instant warning alerts on fullscreen exit.
* **Copy-Paste & Right-Click Disabling**:
  * Intercepts and blocks context menu right-clicks and clipboard copy/paste attempts.
* **Rapid Guessing Detection**:
  * Detects rushed responses submitted under 1.8 seconds on non-trivial questions and flags suspicious rush patterns.
* **Multi-Factor Integrity Gauge & Audit Trail**:
  * 0–100% composite score rating (*Pristine*, *Moderate Caution*, *High Suspicion*).
  * Timestamped security incident logs in the admin attempt inspector.

---

### 🎮 3. Live Classroom Arena & Multiplayer Host Mode
* **Kahoot/Quizizz-Style Host Broadcasting**:
  * Host room generator with 6-digit game PIN and QR code join link.
  * Live connected players lobby with real-time avatar arrival animations.
  * Synchronized 30-second question timer with tick audio and speed-accuracy scoring ($Score = Base + SpeedBonus$).
  * Real-time student answer distribution bar charts.
  * Top-5 Podium Leaderboard and championship confetti celebration.
* **Mobile Gamepad Controller (`LivePlayerController`)**:
  * Responsive 4-shape gamepad interface (Red ▲, Blue ◆, Yellow ●, Green ■) with haptic feedback.

---

### 🔥 4. Daily Login Streak Rewards & Mythic Mystery Loot Box
* **7-Day Streak Calendar**:
  * Escalating daily coin and XP multipliers.
  * Day 7 awards the **Mythic Mystery Loot Box**!
* **Interactive 3D Mystery Chest Unboxing**:
  * Shaking chest animation with sparkling aura, particle explosions, sound fanfares, and rare/epic/legendary loot cards (Coins, XP, Power-Ups).

---

### 🎵 5. Zero-Latency Web Audio & Haptics Engine
* **Synthesized Web Audio API**:
  * Zero external sound asset load times with 100% offline support.
  * Harmonious arpeggios for correct answers, low buzzers for wrong choices, escalating streak pitch multipliers, clock ticks, and level-up fanfares.
  * Device vibration & haptic feedback integration (`navigator.vibrate`).
  * Persistent mute toggle in user settings.

---

### 📄 6. PDF & Excel / CSV Export Engine
* **Branded PDF Reports**:
  * Multi-page assessment breakdown reports generated directly in the browser via `jsPDF`.
* **Excel-Compatible CSV Exports**:
  * UTF-8 BOM CSV exports for individual attempt logs and question error diagnostics.

---

### ⚡ 7. Performance, Offline PWA & Accessibility
* **Full Keyboard Hotkeys**:
  * Select options via `[1-4]` or `[A-D]`, confirm with `Enter`, navigate questions with `←/→`, and press `?` to open the shortcuts modal.
* **Offline-First Outbox Sync**:
  * Automatically stores completed attempts in a local outbox if disconnected and seamlessly syncs to the server when connection resumes.
* **WAI-ARIA Accessibility**:
  * Semantic `role="radiogroup"`, `role="radio"`, `aria-live` dynamic announcements, and high-contrast indicators.

---

### 📊 8. Admin Control Center, Cohort Intelligence & Live Proctoring
* **Real-Time Live Proctoring Monitor (`LiveProctoringManagement`)**:
  * Live exam surveillance grid with auto-refresh every 15s.
  * Live risk filters (*All*, *High Risk*, *Moderate*, *Pristine*) with instant telemetry counts.
* **Cohort & Tier Analytics (`CohortAnalyticsManagement`)**:
  * Performance tiers (*High Performers ≥80%*, *Proficient 60-79%*, *Needs Attention <60%*).
  * Experience cohorts (*Novice*, *Adept*, *Master*) and topic mastery matrices.
* **Question Misconception & Error Diagnostics (`QuestionAnalyticsManagement`)**:
  * Failure rate rankings and top distractor identification with one-click CSV export.
* **Deep Attempt Inspector (`AttemptDetailsModal`)**:
  * Detailed student response breakdown, correct answer comparisons, security telemetry pills, and PDF/CSV export.
  * Progressive Web App support with service workers, install prompts, and responsive mobile-first layouts.
* **Theme System**:
  * Dynamic dark/light mode with ambient reactive gradients.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Blockly, Canvas Confetti |
| **Backend** | Node.js (ES Modules), Express.js, Socket.IO, Mongoose |
| **Database** | MongoDB Atlas / Local MongoDB |
| **AI Inference** | Groq SDK (`llama-3.3-70b-versatile`, `llama-3.2-90b`, `mixtral-8x7b-32768`) |
| **Security & Auth** | JWT (JSON Web Tokens), Bcrypt.js, Express-Rate-Limit, CORS |
| **Document Parsing**| `pdf-parse`, `office-text-extractor` |

---

## 📦 Project Structure

```
Quiz-Platform/
├── client/                     # Frontend Application (React + Vite + TS)
│   ├── public/                 # Static assets, icons, manifest
│   └── src/
│       ├── components/
│       │   ├── admin/          # Admin CMS, InspectorPanel, AttemptDetailsModal, Analytics
│       │   ├── badges/         # Badge nodes & skill progression UI
│       │   ├── chat/           # Global and direct messaging windows
│       │   ├── common/         # Modals, SearchBars, EmptyStates
│       │   ├── engage/         # DailyChallenge, Shop, StudyCard, Tournaments
│       │   ├── multiplayer/    # Real-time WebSocket 1v1 VS Game
│       │   ├── question-types/ # Compiler & Blockly question renderers
│       │   ├── quizzes/        # Quiz cards, editor modals, question editors
│       │   ├── social/         # ClanHub, FriendList, DirectChat
│       │   └── tracks/         # Skill trees & roadmap visualizers
│       ├── context/            # AuthContext, ThemeContext, NotificationContext
│       ├── lib/                # API client, Socket instance, sound utils
│       ├── pages/              # App route views (Dashboard, Quizzes, Clans, Admin, etc.)
│       └── types/              # Full TypeScript interface definitions
│
├── server/                     # Backend API & WebSocket Server
│   ├── config/                 # DB connection and CORS configuration
│   ├── controllers/            # Route business logic (AI, Quizzes, Clans, Attempts, etc.)
│   ├── middleware/             # Auth, Admin validation, error handlers, rate limiters
│   ├── models/                 # Mongoose schemas (User, Quiz, Attempt, Clan, Badge, etc.)
│   ├── routes/                 # Express API routes
│   ├── services/               # Compiler evaluation, progress tracking services
│   ├── utils/                  # Token optimizers, AI limiter, XP sync
│   └── index.js                # Server entry point & Socket.IO initialization
│
├── package.json                # Root package & monorepo scripts
└── vercel.json                 # Vercel deployment configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: v20.18+ or v22.0+
* **npm** or **yarn** / **pnpm**
* **MongoDB**: Local MongoDB server or a free MongoDB Atlas cluster

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/MohaMedTArEk912/Quiz-Platform.git
cd Quiz-Platform

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Environment Variables Setup
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/quiz-platform

# Security & JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# Client / Server URLs
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_ENABLE_SOCKET=true

# AI Quiz Studio (Optional, powered by Groq)
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Running Locally
Run both client and server concurrently:
```bash
npm run dev
```

* **Client UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

To run them in separate terminals:
```bash
# Terminal 1: Backend Server
npm run server

# Terminal 2: Frontend Client
npm run client
```

---

## 🌐 Production Deployment

This project is configured for split deployment:

### 1. Backend (Koyeb / Render / Railway)
* Point deployment to `server/index.js`.
* Set environment variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=5000`, `CLIENT_URL=https://your-frontend.vercel.app`, and `GROQ_API_KEY`.

### 2. Frontend (Vercel)
* Connect repository and set root or `client` as directory.
* Framework Preset: **Vite**.
* Build Command: `npm run build`
* Output Directory: `dist`
* Environment Variables:
  * `VITE_API_URL`: `https://your-backend.koyeb.app/api`
  * `VITE_SOCKET_URL`: `https://your-backend.koyeb.app`
  * `VITE_ENABLE_SOCKET`: `true`

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

---

Made with ❤️ by the **Quiz Platform Team** for learners, educators, and developers worldwide.
