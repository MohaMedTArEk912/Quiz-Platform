---
title: Quiz Platform
emoji: 📝
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---

# 🎓 Quiz Platform - Full Stack Application

A comprehensive AI-powered quiz platform with real-time features, gamification, and advanced analytics.

## ✨ Features

- 🤖 **AI Quiz Generation** - Powered by Groq API
- 📊 **Real-time Analytics** - Track progress and performance
- 🏆 **Gamification** - Badges, achievements, clans, and tournaments
- 👥 **Social Features** - Compete with friends, join clans
- 📱 **Responsive Design** - Works on all devices
- 🔐 **Secure Authentication** - JWT + Google OAuth
- 💾 **MongoDB Backend** - Reliable data persistence

## 🚀 Deployment on Hugging Face Spaces

### Prerequisites

1. **MongoDB Database** (Required)
   - Sign up for free at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster and get your connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

2. **Groq API Key** (Required for AI features)
   - Get your free API key from [Groq Console](https://console.groq.com)

3. **Google OAuth Credentials** (Optional)
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)

### Setup Steps

#### 1. Create a New Hugging Face Space

- Go to https://huggingface.co/new-space
- Select **Docker** as SDK
- Choose your space name (e.g., `quiz-platform`)
- Set visibility (Public/Private)

#### 2. Configure Environment Variables

In your Space Settings → Repository Secrets, add:

**Required:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A random secure string (min 32 characters)
  ```bash
  # Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `GROQ_API_KEY` - Your Groq API key
- `CLIENT_URL` - Your Space URL: `https://YOUR-USERNAME-quiz-platform.hf.space`

**Optional:**
- `GOOGLE_CLIENT_ID` - For Google OAuth login
- `GOOGLE_CLIENT_SECRET` - For Google OAuth login

#### 3. Deploy Your Code

**Option A: Clone and Push**
```bash
# Clone your HF Space
git clone https://huggingface.co/spaces/YOUR-USERNAME/quiz-platform
cd quiz-platform

# Add this repository as remote
git remote add source https://github.com/MohaMedTArEk912/Quiz-Platform.git

# Pull the huggingface-deployment branch
git pull source huggingface-deployment

# Push to HF Space
git push origin main
```

**Option B: From Existing Repository**
```bash
# In your local Quiz-Platform repository
git checkout huggingface-deployment

# Add HF Space as remote
git remote add hf https://huggingface.co/spaces/YOUR-USERNAME/quiz-platform

# Push to HF Space
git push hf huggingface-deployment:main
```

#### 4. Wait for Build

- Hugging Face will automatically build your Docker container
- This may take 5-10 minutes for the first build
- Check the build logs for any errors

#### 5. Access Your Application

Once deployed, your app will be available at:
```
https://YOUR-USERNAME-quiz-platform.hf.space
```

## 🧪 Local Testing with Docker

Test the Docker setup locally before deploying:

```bash
# 1. Create a .env file with your variables
cat > .env << EOF
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_key
EOF

# 2. Build and run with docker-compose
docker-compose up --build

# 3. Access at http://localhost:7860
```

Or build manually:
```bash
# Build
docker build -t quiz-platform .

# Run
docker run -p 7860:7860 \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_jwt_secret" \
  -e GROQ_API_KEY="your_groq_key" \
  -e CLIENT_URL="http://localhost:7860" \
  quiz-platform
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   React Frontend (Vite + TypeScript)│
│   - Modern UI with Tailwind CSS     │
│   - Real-time updates               │
│   - PWA capabilities                │
└──────────────┬──────────────────────┘
               │
               │ REST API
               ▼
┌─────────────────────────────────────┐
│   Express.js Backend                │
│   - JWT Authentication              │
│   - Rate Limiting                   │
│   - Security Middleware             │
└──────────────┬──────────────────────┘
               │
               ├──► MongoDB (Database)
               ├──► Groq API (AI)
               └──► Google OAuth
```

## 📊 Space Requirements

**Recommended Hardware (HF Space):**
- **CPU:** 2 vCPUs
- **RAM:** 16GB
- **Storage:** 10GB

**Free Tier Limitations:**
- May sleep after inactivity
- Limited concurrent users
- Consider upgrading for production use

## 🔧 Troubleshooting

### Build Fails
- Check that all required env vars are set
- Review build logs in HF Space
- Ensure MongoDB URI is accessible from HF servers

### Connection Issues
- Verify `CLIENT_URL` matches your actual Space URL
- Check MongoDB Atlas network access (allow all IPs: `0.0.0.0/0`)
- Ensure MongoDB cluster is not paused

### Health Check Fails
- The app exposes `/api/health` endpoint
- Check if MongoDB connection is working
- Review container logs in HF Space

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for JWT token signing |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `CLIENT_URL` | ✅ | Your HF Space URL |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth secret |
| `PORT` | ❌ | Server port (default: 7860) |
| `NODE_ENV` | ❌ | Environment (default: production) |

## 🔒 Security Features

- Helmet.js for HTTP headers
- Rate limiting on API endpoints
- MongoDB sanitization
- CORS protection
- JWT token authentication
- HPP protection against parameter pollution

## 📦 Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (Build tool)
- Tailwind CSS
- Monaco Editor
- Socket.io Client

**Backend:**
- Node.js + Express 5
- MongoDB + Mongoose
- JWT Authentication
- Groq SDK (AI)
- Socket.io

## 📄 License

See the main repository for license information.

## 🤝 Contributing

This is a deployment branch. For contributions, visit the main repository.

## 🆘 Support

- Create an issue in the main repository
- Check [Hugging Face Docs](https://huggingface.co/docs/hub/spaces-sdks-docker)
- Review logs in your Space's settings
