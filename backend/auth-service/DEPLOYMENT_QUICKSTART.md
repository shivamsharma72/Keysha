# Quick Start: Deploy Auth Service to AWS Lambda

## 🚀 5-Minute Deployment

### Prerequisites Check
```bash
# 1. AWS CLI installed and configured
aws --version
aws configure  # If not configured yet

# 2. Serverless Framework installed
npm install -g serverless
# Or use: npx serverless (no install needed)
```

### Deploy Steps

```bash
cd backend/auth-service

# 1. Install dependencies
npm install

# 2. Set environment variables
cp env.template .env
# Edit .env with your values (MongoDB URI, Google OAuth, etc.)
# IMPORTANT: Update GOOGLE_REDIRECT_URI to your Vercel URL

# 3. Build TypeScript
npm run build

# 4. Deploy to AWS
npm run deploy:dev
```

### After Deployment

1. **Copy the API Gateway URL** from the output:
   ```
   endpoints:
     ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
   ```

2. **Update Vercel Frontend `.env`:**
   ```env
   VITE_AUTH_SERVICE_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com
   ```

3. **Update Google OAuth Redirect URI:**
   - Go to Google Cloud Console
   - Add: `https://your-vercel-app.vercel.app/auth/callback`

4. **Test:**
   ```bash
   curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/health
   ```

## 💰 Cost Breakdown

**Free Tier (First 12 Months):**
- ✅ Lambda: 1M requests/month FREE
- ✅ API Gateway: 1M calls/month FREE
- ✅ CloudWatch Logs: 5GB/month FREE
- **Total: $0/month** (for typical usage)

**After Free Tier:**
- Lambda: $0.20 per 1M requests
- API Gateway: $3.50 per 1M requests
- **Total: ~$3.70 per 1M requests** (still very cheap!)

## 📝 Files Created

- `src/handler.ts` - Lambda handler wrapper
- `serverless.yml` - Serverless Framework config
- `DEPLOYMENT.md` - Full deployment guide

## 🐛 Common Issues

**"Access Denied"**
```bash
aws configure  # Reconfigure credentials
```

**"Module not found: serverless-http"**
```bash
npm install  # Reinstall dependencies
```

**CORS Errors**
- Check `VERCEL_FRONTEND_URL` in `.env`
- Verify CORS config in `serverless.yml`

## 📚 Full Guide

See `DEPLOYMENT.md` for detailed instructions, troubleshooting, and production setup.
