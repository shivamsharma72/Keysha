# Quick Start Guide - Auth Service

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd backend/auth-service
npm install
```

### Step 2: Set Up Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add:
- MongoDB URI (from MongoDB Atlas)
- Google OAuth credentials (from Google Cloud Console)
- JWT secret (generate with `openssl rand -base64 32`)
- Encryption key (generate with `openssl rand -base64 32`)

### Step 3: Start Server
```bash
npm run dev
```

Server starts on `http://localhost:3001`

### Step 4: Test It
```bash
# Health check
curl http://localhost:3001/health

# Initiate OAuth
curl -X POST http://localhost:3001/auth/initiate
```

## 🔧 Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Google+ API and Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/auth/callback`
7. Copy Client ID and Client Secret to `.env`

## 📊 Getting MongoDB URI

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or 0.0.0.0/0 for development)
5. Click "Connect" → "Connect your application"
6. Copy connection string to `.env` as `MONGODB_URI`

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] `.env` file created with all variables
- [ ] MongoDB Atlas cluster created
- [ ] Google OAuth credentials configured
- [ ] Server starts without errors
- [ ] Health check returns `{"status":"ok"}`

## 🐛 Troubleshooting

### "MONGODB_URI not set"
- Check `.env` file exists
- Verify variable name is exactly `MONGODB_URI`

### "Failed to connect to MongoDB"
- Check MongoDB URI is correct
- Verify IP is whitelisted in Atlas
- Check network connectivity

### "GOOGLE_CLIENT_ID not set"
- Verify `.env` file has all Google OAuth variables
- Check for typos in variable names

### Port 3001 already in use
- Change `PORT` in `.env` to another port (e.g., 3002)
- Or kill process using port 3001: `lsof -ti:3001 | xargs kill`
