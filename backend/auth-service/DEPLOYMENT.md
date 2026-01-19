# AWS Lambda Deployment Guide - Auth Service

This guide walks you through deploying the Keysha Auth Service to AWS Lambda using the Serverless Framework.

## 🎯 Why AWS Lambda?

**Cost Breakdown (AWS Free Tier):**
- ✅ **Lambda**: 1M requests/month FREE, then $0.20 per 1M requests
- ✅ **API Gateway**: 1M API calls/month FREE, then $3.50 per 1M requests
- ✅ **CloudWatch Logs**: 5GB logs/month FREE, then $0.50 per GB
- ✅ **Total Cost**: **$0/month** for typical usage (under free tier limits)

**After Free Tier (if you exceed):**
- ~$0.20-0.50 per 1M requests (depending on execution time)
- Still very cheap for small-to-medium apps

## 📋 Prerequisites

1. **AWS Account** (Free tier eligible)
   - Sign up at https://aws.amazon.com/free/
   - Free tier includes 12 months of Lambda + API Gateway

2. **AWS CLI Installed**
   ```bash
   # macOS
   brew install awscli
   
   # Or download from: https://aws.amazon.com/cli/
   ```

3. **AWS Credentials Configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Default region: us-east-1 (or your preferred region)
   # Default output format: json
   ```

4. **Serverless Framework Installed**
   ```bash
   npm install -g serverless
   # Or use npx (no global install needed)
   ```

5. **Node.js 20.x** (Lambda runtime)

## 🚀 Deployment Steps

### Step 1: Install Dependencies

```bash
cd backend/auth-service
npm install
```

This installs:
- `serverless` - Deployment framework
- `serverless-plugin-typescript` - TypeScript compilation
- `serverless-http` - Express → Lambda adapter

### Step 2: Configure Environment Variables

Create a `.env` file (or use AWS Secrets Manager for production):

```bash
cp env.template .env
```

**Required Variables:**
```env
# MongoDB Atlas (you already have this)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/keysha?retryWrites=true&w=majority

# Google OAuth (you already have this)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/callback  # Update to Vercel URL

# JWT (generate new secret)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=1h

# Frontend URLs
FRONTEND_URL=http://localhost:3000  # Local dev
VERCEL_FRONTEND_URL=https://your-vercel-app.vercel.app  # Your Vercel deployment URL

# Service Token (for service-to-service auth)
SERVICE_TOKEN=$(openssl rand -hex 32)

# Encryption Key (for refresh tokens)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

**⚠️ Important:**
- Update `GOOGLE_REDIRECT_URI` to your Vercel frontend URL
- Add your Vercel URL to Google Cloud Console OAuth redirect URIs
- Never commit `.env` to Git (already in `.gitignore`)

### Step 3: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://your-vercel-app.vercel.app/auth/callback
   ```
4. Save

### Step 4: Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 5: Deploy to AWS Lambda

**Deploy to Dev Stage:**
```bash
npm run deploy:dev
```

**Deploy to Production:**
```bash
npm run deploy:prod
```

**What Happens:**
1. Serverless Framework packages your code
2. Creates/updates Lambda function
3. Creates/updates API Gateway endpoints
4. Sets environment variables
5. Returns API Gateway URL

**Expected Output:**
```
Service Information
service: keysha-auth-service
stage: dev
region: us-east-1
stack: keysha-auth-service-dev
resources: 15
api keys:
  None
endpoints:
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/health
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
functions:
  api: keysha-auth-service-dev-api
```

### Step 6: Update Frontend Environment Variables

Update your Vercel frontend `.env`:

```env
VITE_AUTH_SERVICE_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com
```

Redeploy your Vercel frontend to pick up the new URL.

### Step 7: Test Deployment

```bash
# Health check
curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/health

# Should return:
# {"status":"ok","service":"auth-service","timestamp":"...","environment":"dev"}
```

## 🔧 Configuration Options

### Change AWS Region

Edit `serverless.yml`:
```yaml
provider:
  region: us-west-2  # Change to your preferred region
```

### Increase Lambda Memory/Timeout

Edit `serverless.yml`:
```yaml
provider:
  timeout: 60  # 60 seconds (max)
  memorySize: 1024  # 1 GB RAM (faster, but costs more)
```

### Use AWS Secrets Manager (Production)

For production, store secrets in AWS Secrets Manager instead of environment variables:

1. **Create Secret:**
   ```bash
   aws secretsmanager create-secret \
     --name keysha/auth-service/dev \
     --secret-string file://secrets.json
   ```

2. **Update serverless.yml:**
   ```yaml
   provider:
     environment:
       MONGODB_URI: ${ssm:/aws/reference/secretsmanager/keysha/auth-service/dev~true:MONGODB_URI}
   ```

## 📊 Monitoring & Logs

### View Logs

```bash
# Real-time logs
npm run logs

# Or use AWS CLI
aws logs tail /aws/lambda/keysha-auth-service-dev-api --follow
```

### CloudWatch Dashboard

1. Go to AWS Console → CloudWatch → Dashboards
2. Create dashboard for Lambda function
3. Monitor:
   - Invocations (requests)
   - Duration (response time)
   - Errors
   - Throttles

### Set Up Alarms

```bash
# Create CloudWatch alarm for errors
aws cloudwatch put-metric-alarm \
  --alarm-name auth-service-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## 🗑️ Cleanup (Remove Deployment)

```bash
npm run remove
```

This deletes:
- Lambda function
- API Gateway
- CloudWatch log groups
- IAM roles

**⚠️ Warning:** This permanently deletes your deployment!

## 💰 Cost Optimization Tips

1. **Use Provisioned Concurrency** (only if needed)
   - Prevents cold starts but costs extra
   - Only needed for high-traffic apps

2. **Optimize Package Size**
   - Smaller packages = faster cold starts
   - Already configured in `serverless.yml` (excludes dev files)

3. **Monitor Usage**
   - Set up AWS Budget alerts
   - Track Lambda invocations in CloudWatch

4. **Use Reserved Concurrency** (optional)
   - Limits concurrent executions
   - Prevents runaway costs

## 🐛 Troubleshooting

### Error: "Cannot find module 'serverless-http'"

```bash
npm install serverless-http --save
```

### Error: "Access Denied" during deployment

Check AWS credentials:
```bash
aws sts get-caller-identity
```

### Error: "Lambda timeout"

Increase timeout in `serverless.yml`:
```yaml
provider:
  timeout: 60
```

### Cold Start Too Slow

- Increase memory (faster CPU)
- Use provisioned concurrency (eliminates cold starts)
- Optimize MongoDB connection (already done - connection pooling)

### CORS Errors

Check CORS configuration in `serverless.yml` and `cors.middleware.ts`. Ensure Vercel URL is in allowed origins.

## 📚 Next Steps

After deploying auth-service:

1. ✅ **Deploy Item Service** (same process)
2. ✅ **Deploy Integration Service** (same process)
3. ✅ **Deploy AI Chat Service** (Python - different process, use AWS SAM or Zappa)
4. ✅ **Update Frontend** with all service URLs
5. ✅ **Test End-to-End** authentication flow

## 🔗 Useful Links

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [AWS Free Tier](https://aws.amazon.com/free/)
