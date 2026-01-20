# Quick Start: Deploy AI Chat Service to Google Cloud Run

## Prerequisites Checklist

- [ ] Google Cloud account with $300 credits
- [ ] `gcloud` CLI installed: `gcloud --version`
- [ ] `docker` installed: `docker --version`
- [ ] Environment variables ready (see below)

## Step 1: Set Up GCP Project (5 minutes)

```bash
# Login
gcloud auth login

# Create project
gcloud projects create keysha-ai-service --name="Keysha AI Service"

# Set active project
gcloud config set project keysha-ai-service

# Enable billing (use your $300 credit account)
gcloud billing accounts list
gcloud billing projects link keysha-ai-service --billing-account=YOUR_BILLING_ID
```

## Step 2: Prepare Credentials (2 minutes)

You need to encode your MCP server credentials as base64:

```bash
cd backend/mcp-google-workspace

# Encode .gauth.json
cat .gauth.json | base64 | pbcopy  # macOS
# or
cat .gauth.json | base64 | xclip -selection clipboard  # Linux

# Encode .accounts.json (if it exists)
cat .accounts.json | base64 | pbcopy  # macOS
```

Save these base64 strings - you'll need them in Step 3.

## Step 3: Set Environment Variables

Export these variables before running deploy.sh:

```bash
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/keysha?retryWrites=true&w=majority"
export GEMINI_API_KEY="your-gemini-api-key"
export SERVICE_TOKEN="your-service-token"  # Must match other services
export JWT_SECRET="your-jwt-secret"  # Must match auth-service
export AUTH_SERVICE_URL="https://your-auth.execute-api.us-east-1.amazonaws.com"
export ITEM_SERVICE_URL="https://your-item.execute-api.us-east-1.amazonaws.com"
export INTEGRATION_SERVICE_URL="https://your-integration.execute-api.us-east-1.amazonaws.com"
export FRONTEND_URL="https://keysha-smoky.vercel.app"
export MCP_GAUTH_JSON_B64="your-base64-encoded-gauth-json"
export MCP_ACCOUNTS_JSON_B64="your-base64-encoded-accounts-json"  # Optional
```

## Step 4: Deploy (10 minutes)

```bash
cd backend/ai-chat-service
chmod +x deploy.sh
./deploy.sh keysha-ai-service us-central1
```

The script will:
1. ✅ Enable required APIs
2. ✅ Build Docker image
3. ✅ Push to Container Registry
4. ✅ Deploy to Cloud Run
5. ✅ Show you the service URL

## Step 5: Update Frontend

Add to Vercel environment variables:

```
VITE_AI_SERVICE_URL=https://keysha-ai-chat-service-xxxxx-uc.a.run.app
```

Then redeploy frontend.

## Step 6: Test

```bash
# Get service URL
gcloud run services describe keysha-ai-chat-service \
    --region us-central1 \
    --format 'value(status.url)'

# Test health endpoint
curl https://your-service-url.run.app/health
```

## Troubleshooting

### View Logs
```bash
gcloud run services logs read keysha-ai-chat-service --region us-central1 --limit 50
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

### Rebuild After Code Changes
```bash
# Just run deploy.sh again
./deploy.sh keysha-ai-service us-central1
```

## Cost Estimate

With $300 credits:
- **Cloud Run**: Free tier = 2M requests/month, 360K GB-seconds
- **Container Registry**: Free tier = 0.5 GB storage
- **Estimated cost**: $0-5/month (well within free tier)

## Next Steps

1. ✅ Deploy service
2. ✅ Update frontend `VITE_AI_SERVICE_URL`
3. ✅ Test chat functionality
4. ✅ Monitor logs: `gcloud run services logs tail keysha-ai-chat-service --region us-central1`
