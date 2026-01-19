# Keysha Auth Service

Authentication service implementing Google OAuth 2.0 with PKCE, JWT tokens, and MongoDB storage.

## 🎯 What This Service Does

This service handles user authentication for Keysha:

1. **OAuth Flow Initiation** - Generates Google OAuth URLs with PKCE
2. **Token Exchange** - Exchanges authorization codes for Google tokens
3. **User Management** - Creates/updates users in MongoDB
4. **JWT Generation** - Issues stateless JWTs for frontend sessions
5. **Token Refresh** - Refreshes JWTs using stored refresh tokens
6. **Secure Storage** - Encrypts and stores Google refresh tokens

## 🏗️ Architecture

### Hotel Key Card Analogy

- **Access Token (Google)**: Temporary pass to hotel facilities (expires in ~1 hour)
- **Refresh Token (Google)**: Your ID at front desk (stored securely, used to get new passes)
- **JWT (Our App)**: Your room key card (expires in 1 hour, can get new one with your ID)

### Flow

```
1. User clicks "Sign in with Google"
   → Frontend calls POST /auth/initiate
   → Backend generates PKCE + OAuth URL
   → Returns URL to frontend

2. User authenticates with Google
   → Google redirects to /auth/callback?code=xxx
   → Frontend sends code + verifier to POST /auth/callback
   → Backend exchanges code for tokens
   → Backend stores refresh token (encrypted)
   → Backend issues JWT to frontend

3. User makes API requests
   → Frontend sends JWT in Authorization header
   → Backend verifies JWT
   → Request proceeds

4. JWT expires
   → Frontend calls POST /auth/refresh
   → Backend uses refresh token to get new JWT
   → Returns new JWT to frontend
```

## 📋 Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Project with OAuth credentials

## 🚀 Setup

### 1. Install Dependencies

```bash
cd backend/auth-service
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Server
PORT=3001
NODE_ENV=development

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/keysha

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_32_character_secret_here
JWT_EXPIRES_IN=1h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Encryption Key (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### 3. Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## 📡 API Endpoints

### POST /auth/initiate
Initiates OAuth flow.

**Request:** None

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "codeVerifier": "random_string_here"
}
```

### POST /auth/callback
Completes OAuth flow.

**Request:**
```json
{
  "code": "authorization_code_from_google",
  "codeVerifier": "code_verifier_from_initiate"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### POST /auth/refresh
Refreshes JWT token.

**Request:** 
- Header: `Authorization: Bearer <expired_jwt>`

**Response:**
```json
{
  "token": "new_jwt_token",
  "user": { ... }
}
```

### POST /auth/logout
Logs out user.

**Request:**
- Header: `Authorization: Bearer <jwt>`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/me
Gets current user info.

**Request:**
- Header: `Authorization: Bearer <jwt>`

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Test OAuth Initiation
```bash
curl -X POST http://localhost:3001/auth/initiate
```

## 📁 Project Structure

```
backend/auth-service/
├── src/
│   ├── config/          # Configuration (DB, OAuth, JWT)
│   ├── models/          # MongoDB schemas
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utilities (PKCE, encryption, logging)
│   └── index.ts         # Entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## 🔒 Security Features

1. **PKCE** - Prevents authorization code interception
2. **Encrypted Refresh Tokens** - AES-256-GCM encryption
3. **JWT Expiration** - Short-lived tokens (1 hour)
4. **CORS Protection** - Only allows frontend origin
5. **Input Validation** - Zod schema validation
6. **Error Handling** - No sensitive data in errors

## 🎓 Key Concepts Explained

### Why PKCE?
Prevents "authorization code interception" attacks. Even if someone steals the code from the redirect URL, they can't exchange it without the code verifier.

### Why Encrypt Refresh Tokens?
Refresh tokens are long-lived credentials. If database is compromised, encrypted tokens are useless without the encryption key.

### Why JWT?
Stateless authentication - perfect for serverless (AWS Lambda). No need for server-side sessions.

### Why Store Refresh Token on Backend?
Security! If frontend stores it, anyone with access to the browser can steal it. Backend storage keeps it secure.

## 🚀 Deployment (AWS Lambda)

This service is designed to be Lambda-ready:

1. Stateless design (no in-memory sessions)
2. Environment variables for configuration
3. Connection pooling for MongoDB
4. Structured logging for CloudWatch

To deploy:
1. Build: `npm run build`
2. Package `dist/` folder
3. Deploy to Lambda with API Gateway
4. Set environment variables in Lambda configuration

## 📝 Next Steps

1. Set up MongoDB Atlas cluster
2. Configure Google OAuth credentials
3. Test OAuth flow end-to-end
4. Connect frontend to test full integration
5. Deploy to AWS Lambda
