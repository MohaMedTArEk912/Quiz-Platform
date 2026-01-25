---
title: Quiz Platform
emoji: 📝
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---

# Quiz Platform

A comprehensive quiz platform with AI-powered features.

## Features
- Interactive quizzes
- AI quiz generation
- User progress tracking
- Badges and achievements
- Real-time challenges

## Environment Variables Required

You need to set these in your Space settings:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GROQ_API_KEY` - Groq API key for AI features
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret (optional)
- `CLIENT_URL` - Your Hugging Face Space URL (e.g., https://username-quiz-platform.hf.space)

## Deployment

This space runs as a Docker container with Node.js backend and React frontend.
