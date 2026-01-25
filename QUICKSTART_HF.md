# 🚀 Quick Start - Hugging Face Deployment

## Prerequisites Checklist

- [ ] Hugging Face account (free): https://huggingface.co/join
- [ ] MongoDB Atlas account (free): https://www.mongodb.com/cloud/atlas/register
- [ ] Groq API key (free): https://console.groq.com

## 🎯 5-Minute Deployment

### Step 1: Get Your MongoDB Connection String

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster (if you don't have one)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://...`)
5. Replace `<password>` with your actual password

### Step 2: Get Your Groq API Key

1. Go to [Groq Console](https://console.groq.com)
2. Sign in/Create account
3. Go to "API Keys"
4. Create new API key
5. Copy the key (starts with `gsk_`)

### Step 3: Create Hugging Face Space

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Owner**: Your username
   - **Space name**: `quiz-platform` (or your choice)
   - **License**: Apache 2.0
   - **Select SDK**: Docker
   - **Space hardware**: CPU basic (free tier)
3. Click "Create Space"

### Step 4: Deploy Code

#### Option A: Using PowerShell Script (Recommended for Windows)

```powershell
# In your Quiz Platform directory
.\deploy-to-hf.ps1
```

Follow the prompts!

#### Option B: Manual Deployment

```bash
# 1. Make sure you're on the right branch
git checkout huggingface-deployment

# 2. Add HF Space as remote (replace USERNAME and SPACE-NAME)
git remote add hf https://huggingface.co/spaces/USERNAME/SPACE-NAME

# 3. Push code
git push hf huggingface-deployment:main
```

### Step 5: Configure Environment Variables

1. Go to your Space: `https://huggingface.co/spaces/USERNAME/quiz-platform`
2. Click "Settings" tab
3. Scroll to "Repository secrets"
4. Add these variables:

| Variable | Value | How to Get |
|----------|-------|------------|
| `MONGODB_URI` | Your MongoDB connection string | From Step 1 |
| `JWT_SECRET` | Random 32+ character string | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GROQ_API_KEY` | Your Groq API key | From Step 2 |
| `CLIENT_URL` | Your Space URL | `https://USERNAME-quiz-platform.hf.space` |

Optional (for Google OAuth):
- `GOOGLE_CLIENT_ID` - From [Google Cloud Console](https://console.cloud.google.com)
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

5. Click "Save" for each variable

### Step 6: Wait for Build

- The build will start automatically
- Watch progress in the "Logs" section
- First build takes ~5-10 minutes
- You'll see "Running on http://0.0.0.0:7860" when ready

### Step 7: Access Your App! 🎉

Your quiz platform is now live at:
```
https://USERNAME-quiz-platform.hf.space
```

## ✅ Verify Deployment

1. **Health Check**: Visit `https://YOUR-SPACE.hf.space/api/health`
   - Should return: `{"status":"ok"}`

2. **Frontend**: Visit `https://YOUR-SPACE.hf.space`
   - Should load the quiz platform homepage

3. **Test Login**: Try creating an account

## 🔧 Troubleshooting

### Build Fails
- **Check logs** in your Space's "Logs" section
- **Verify** all environment variables are set correctly
- **Ensure** MongoDB URI is correct and accessible

### "Cannot connect to MongoDB"
1. Go to MongoDB Atlas → Network Access
2. Add IP address: `0.0.0.0/0` (allow from anywhere)
3. Save and wait 2 minutes
4. Restart your Space (Settings → Factory reboot)

### Space Shows "Building..."
- First build takes 5-10 minutes
- Refresh the page
- Check "Logs" for progress

### 502 Bad Gateway
- Space may be starting up (wait 1-2 minutes)
- Check if all environment variables are set
- Restart Space if it persists

## 🧪 Test Locally First (Optional)

Before deploying, test locally with Docker:

```bash
# Create .env file with your variables
cp .env.example .env
# Edit .env with your actual values

# Build and run
docker-compose up --build

# Access at http://localhost:7860
```

## 📊 Monitor Your Space

- **Usage**: Check Settings → Usage
- **Logs**: View real-time logs in your Space
- **Analytics**: See visitor stats in Space overview

## 🎓 Next Steps

1. **Customize**: Update app colors, name in `README_HF.md`
2. **Upgrade**: Consider upgrading to better hardware for production
3. **Monitor**: Set up MongoDB alerts for usage
4. **Backup**: Regularly backup your MongoDB database

## 📚 Additional Resources

- [Detailed README](./README_HF.md) - Complete documentation
- [Docker Compose](./docker-compose.yml) - Local testing
- [HF Spaces Docs](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)

## 🆘 Need Help?

- Check [README_HF.md](./README_HF.md) for detailed troubleshooting
- Review HF Space logs
- Open an issue in the main repository

---

**Note**: This is the `huggingface-deployment` branch. Do not merge into `main`.
