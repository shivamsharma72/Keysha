# URL Configuration Checklist

This document lists all URLs that need to be configured when deploying the AI Chat Service to Google Cloud Run.

## ✅ URLs That Need to Be Updated

### 1. **AI Chat Service (Google Cloud Run)** - Environment Variables

When deploying to Cloud Run, set these environment variables:

```bash
# AWS Lambda Services (from your existing deployments)
AUTH_SERVICE_URL=https://3gy86d595f.execute-api.us-east-1.amazonaws.com
ITEM_SERVICE_URL=https://hfey0j54tj.execute-api.us-east-1.amazonaws.com
INTEGRATION_SERVICE_URL=https://txfyll4tdh.execute-api.us-east-1.amazonaws.com

# Frontend (Vercel)
FRONTEND_URL=https://keysha-smoky.vercel.app

# Other required vars (from your .env files)
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your-gemini-key
SERVICE_TOKEN=your-service-token  # Must match other services
JWT_SECRET=your-jwt-secret  # Must match auth-service
```

### 2. **Frontend (Vercel)** - Environment Variable

After deploying AI Chat Service to Cloud Run, add this to Vercel:

```
VITE_AI_SERVICE_URL=https://keysha-ai-chat-service-xxxxx-uc.a.run.app
```

**Where to find the URL:**
```bash
# After deployment, get the URL:
gcloud run services describe keysha-ai-chat-service \
    --region us-central1 \
    --format 'value(status.url)'
```

### 3. **MCP Server** - No URL Updates Needed ✅

The MCP server runs as a **subprocess** inside the AI Chat Service container. It:
- ✅ Uses the same Google OAuth credentials (from `.gauth.json`)
- ✅ Doesn't need to know about Lambda URLs
- ✅ Communicates with Google APIs directly
- ✅ OAuth redirect URI (`http://localhost:4100/code`) works fine inside the container

**Note:** The MCP server's OAuth flow happens entirely within the Cloud Run container, so `localhost:4100` is correct and doesn't need to be changed.

## 📋 Quick Checklist

### Before Deploying AI Chat Service:
- [ ] Get AWS Lambda URLs (already have them ✅)
- [ ] Get Vercel frontend URL (already have it ✅)
- [ ] Prepare MongoDB URI
- [ ] Prepare Gemini API key
- [ ] Prepare SERVICE_TOKEN (must match other services)
- [ ] Prepare JWT_SECRET (must match auth-service)

### After Deploying AI Chat Service:
- [ ] Get Cloud Run service URL
- [ ] Add `VITE_AI_SERVICE_URL` to Vercel environment variables
- [ ] Redeploy frontend (or push commit to trigger auto-deploy)

## 🔄 Service Communication Flow

```
Frontend (Vercel)
    ↓ (uses VITE_AI_SERVICE_URL)
AI Chat Service (Cloud Run)
    ↓ (uses AUTH_SERVICE_URL, ITEM_SERVICE_URL, INTEGRATION_SERVICE_URL)
AWS Lambda Services
    ↓
MongoDB Atlas
```

```
AI Chat Service (Cloud Run)
    ↓ (spawns subprocess)
MCP Server (Node.js subprocess)
    ↓ (uses Google OAuth from .gauth.json)
Google Calendar/Gmail APIs
```

## 🚨 Important Notes

1. **SERVICE_TOKEN** must match across ALL services:
   - `backend/auth-service/.env`
   - `backend/item-service/.env`
   - `backend/integration-service/.env`
   - AI Chat Service Cloud Run env vars

2. **JWT_SECRET** must match between:
   - `backend/auth-service/.env`
   - AI Chat Service Cloud Run env vars

3. **CORS**: The AI Chat Service allows requests from `FRONTEND_URL`. Make sure this matches your Vercel URL exactly.

4. **MCP Server OAuth**: The redirect URI `http://localhost:4100/code` is correct for Cloud Run because:
   - The OAuth flow happens inside the container
   - Google redirects to localhost:4100 within the container
   - This is a local redirect, not an external URL

## 📝 Example Deployment Command

```bash
# Export all environment variables
export MONGODB_URI="mongodb+srv://..."
export GEMINI_API_KEY="your-key"
export SERVICE_TOKEN="your-token"
export JWT_SECRET="your-secret"
export AUTH_SERVICE_URL="https://3gy86d595f.execute-api.us-east-1.amazonaws.com"
export ITEM_SERVICE_URL="https://hfey0j54tj.execute-api.us-east-1.amazonaws.com"
export INTEGRATION_SERVICE_URL="https://txfyll4tdh.execute-api.us-east-1.amazonaws.com"
export FRONTEND_URL="https://keysha-smoky.vercel.app"
export MCP_GAUTH_JSON_B64="base64-encoded-gauth-json"
export MCP_ACCOUNTS_JSON_B64="base64-encoded-accounts-json"

# Deploy
cd backend/ai-chat-service
./deploy.sh keysha-ai-service us-central1
```
