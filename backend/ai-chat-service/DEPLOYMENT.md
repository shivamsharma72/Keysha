# Google Cloud Run Deployment Guide

This guide walks you through deploying the Keysha AI Chat Service to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** with $300 credits (you have this ✅)
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed: https://docs.docker.com/get-docker/
4. **Environment Variables** ready (see below)

## Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create keysha-ai-service --name="Keysha AI Service"

# Set as active project
gcloud config set project keysha-ai-service

# Enable billing (link your account with $300 credits)
gcloud billing accounts list
gcloud billing projects link keysha-ai-service --billing-account=YOUR_BILLING_ACCOUNT_ID
```

## Step 2: Prepare Environment Variables

Create a `.env.deploy` file with your production values:

```bash
cd backend/ai-chat-service
cp env.template .env.deploy
```

Edit `.env.deploy` and set:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `GEMINI_API_KEY` - Your Google Gemini API key
- `SERVICE_TOKEN` - Must match other services
- `JWT_SECRET` - Must match auth-service
- `AUTH_SERVICE_URL` - Your AWS Lambda auth service URL
- `ITEM_SERVICE_URL` - Your AWS Lambda item service URL
- `INTEGRATION_SERVICE_URL` - Your AWS Lambda integration service URL
- `FRONTEND_URL` - Your Vercel frontend URL (e.g., https://keysha-smoky.vercel.app)

## Step 3: Build and Deploy

### Option A: Using the Deployment Script (Recommended)

```bash
cd backend/ai-chat-service

# Make script executable
chmod +x deploy.sh

# Export environment variables
export MONGODB_URI="your-mongodb-uri"
export GEMINI_API_KEY="your-gemini-key"
export SERVICE_TOKEN="your-service-token"
export JWT_SECRET="your-jwt-secret"
export AUTH_SERVICE_URL="https://your-auth-service.execute-api.us-east-1.amazonaws.com"
export ITEM_SERVICE_URL="https://your-item-service.execute-api.us-east-1.amazonaws.com"
export INTEGRATION_SERVICE_URL="https://your-integration-service.execute-api.us-east-1.amazonaws.com"
export FRONTEND_URL="https://keysha-smoky.vercel.app"

# Deploy
./deploy.sh keysha-ai-service us-central1
```

### Option B: Manual Deployment

```bash
cd backend/ai-chat-service

# Set project
gcloud config set project keysha-ai-service

# Enable APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push image
docker build -t gcr.io/keysha-ai-service/keysha-ai-chat-service:latest -f Dockerfile ..
docker push gcr.io/keysha-ai-service/keysha-ai-chat-service:latest

# Deploy to Cloud Run
gcloud run deploy keysha-ai-chat-service \
    --image gcr.io/keysha-ai-service/keysha-ai-chat-service:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8000 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars "MONGODB_URI=your-mongodb-uri,GEMINI_API_KEY=your-key,SERVICE_TOKEN=your-token,JWT_SECRET=your-secret,AUTH_SERVICE_URL=https://your-auth.execute-api.us-east-1.amazonaws.com,ITEM_SERVICE_URL=https://your-item.execute-api.us-east-1.amazonaws.com,INTEGRATION_SERVICE_URL=https://your-integration.execute-api.us-east-1.amazonaws.com,FRONTEND_URL=https://keysha-smoky.vercel.app,MCP_SERVER_PATH=/app/mcp-server,MCP_GAUTH_FILE=/app/mcp-server/.gauth.json,MCP_ACCOUNTS_FILE=/app/mcp-server/.accounts.json,NODE_ENV=production,PORT=8000"
```

## Step 4: Configure MCP Server Credentials

The MCP server needs Google OAuth credentials. You have two options:

### Option A: Use Secret Manager (Recommended)

```bash
# Create secrets for sensitive files
gcloud secrets create mcp-gauth --data-file=../mcp-google-workspace/.gauth.json
gcloud secrets create mcp-accounts --data-file=../mcp-google-workspace/.accounts.json

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding mcp-gauth \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

Then mount secrets in Cloud Run (requires updating deployment).

### Option B: Set as Environment Variables (Simpler)

Convert `.gauth.json` and `.accounts.json` to base64 and set as env vars:

```bash
# Encode files
cat ../mcp-google-workspace/.gauth.json | base64
cat ../mcp-google-workspace/.accounts.json | base64

# Add to Cloud Run env vars
gcloud run services update keysha-ai-chat-service \
    --region us-central1 \
    --update-env-vars "MCP_GAUTH_JSON_B64=your-base64-encoded-gauth,MCP_ACCOUNTS_JSON_B64=your-base64-encoded-accounts"
```

Then modify the startup code to decode and write these files.

## Step 5: Update Frontend

Update your Vercel environment variable:

```
VITE_AI_SERVICE_URL=https://keysha-ai-chat-service-xxxxx-uc.a.run.app
```

## Step 6: Test Deployment

```bash
# Get the service URL
gcloud run services describe keysha-ai-chat-service \
    --region us-central1 \
    --format 'value(status.url)'

# Test health endpoint
curl https://your-service-url.run.app/health
```

## Cost Estimation

With $300 credits:
- **Cloud Run**: Free tier covers 2M requests/month, 360K GB-seconds
- **Container Registry**: Free tier covers 0.5 GB storage
- **Estimated monthly cost**: $0-5 (well within free tier for typical usage)

## Troubleshooting

### View Logs
```bash
gcloud run services logs read keysha-ai-chat-service --region us-central1
```

### Check Service Status
```bash
gcloud run services describe keysha-ai-chat-service --region us-central1
```

### Update Environment Variables
```bash
gcloud run services update keysha-ai-chat-service \
    --region us-central1 \
    --update-env-vars "KEY=value"
```

### Rebuild and Redeploy
```bash
# Just run the deploy script again
./deploy.sh keysha-ai-service us-central1
```

## Next Steps

1. ✅ Deploy the service
2. ✅ Update frontend `VITE_AI_SERVICE_URL`
3. ✅ Test chat functionality
4. ✅ Monitor logs and costs
