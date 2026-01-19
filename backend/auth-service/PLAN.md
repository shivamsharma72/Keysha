# Auth Service Implementation Plan

## 🎯 Service Overview

The Auth Service is the **gatekeeper** of your application. It handles user authentication using Google OAuth 2.0 and issues JWTs (JSON Web Tokens) for session management.

## 🏗️ Architecture Overview

### What This Service Does

Think of this service as a **hotel front desk**:
1. **Check-in (Login)**: Verifies your identity (Google OAuth) and gives you a room key (JWT)
2. **Key Card (JWT)**: Short-lived token you use to access your room (protected routes)
3. **Master Key (Refresh Token)**: Stored securely at the front desk (backend), used to get new room keys when yours expires
4. **Check-out (Logout)**: Invalidates your keys and ends your session

### Core Responsibilities

1. **OAuth Flow Initiation** (`POST /auth/initiate`)
   - Generates PKCE code verifier and challenge
   - Creates Google OAuth authorization URL
   - Returns URL + code verifier to frontend

2. **OAuth Callback** (`POST /auth/callback`)
   - Receives authorization code from frontend
   - Exchanges code with Google for access + refresh tokens
   - Stores refresh token in MongoDB (linked to user)
   - Issues JWT to frontend

3. **Token Refresh** (`POST /auth/refresh`)
   - Validates current JWT
   - Uses stored refresh token to get new Google tokens
   - Issues new JWT to frontend

4. **Logout** (`POST /auth/logout`)
   - Invalidates refresh token in MongoDB
   - Clears user session

## 📋 Technical Requirements

### Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|---------------|----------|
| POST | `/auth/initiate` | Start OAuth flow | None | `{ authUrl, codeVerifier }` |
| POST | `/auth/callback` | Complete OAuth | `{ code, codeVerifier }` | `{ token, user }` |
| POST | `/auth/refresh` | Get new JWT | None (uses JWT in header) | `{ token, user }` |
| POST | `/auth/logout` | End session | None (uses JWT in header) | `{ message }` |

### Database Schema (MongoDB)

**Users Collection:**
```typescript
{
  _id: ObjectId,
  googleId: string,           // Google user ID (unique)
  email: string,              // User email
  name: string,                // User name
  picture?: string,            // Profile picture URL
  refreshToken: string,        // Google refresh token (encrypted)
  createdAt: Date,
  updatedAt: Date
}
```

**Why store refresh token?**
- Refresh tokens are long-lived (can last months)
- We need them to get new access tokens when JWT expires
- Must be stored securely (encrypted) on backend, never sent to frontend

### Security Requirements

1. **PKCE (Proof Key for Code Exchange)**
   - Prevents authorization code interception attacks
   - Code verifier: Random string (43-128 chars)
   - Code challenge: SHA256 hash of verifier (base64url encoded)

2. **JWT Structure**
   ```json
   {
     "userId": "mongodb_user_id",
     "email": "user@example.com",
     "iat": 1234567890,  // Issued at
     "exp": 1234571490   // Expires in 1 hour
   }
   ```

3. **Token Storage**
   - **JWT**: Frontend (localStorage) - short-lived (1 hour)
   - **Refresh Token**: Backend (MongoDB) - long-lived (encrypted)

4. **CASA Compliance**
   - Request only necessary scopes: `email`, `profile`, `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/gmail.readonly`
   - Store refresh tokens securely
   - Implement token rotation

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/keysha?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=1h

# CORS
FRONTEND_URL=http://localhost:3000
```

## 🔄 OAuth Flow (Step-by-Step)

### Step 1: Initiate OAuth
```
Frontend → POST /auth/initiate
Backend:
  1. Generate random code_verifier (43 chars)
  2. Hash it → code_challenge
  3. Build Google OAuth URL with:
     - client_id
     - redirect_uri
     - response_type=code
     - scope (email, profile, calendar, gmail.readonly)
     - code_challenge + code_challenge_method=S256
  4. Return { authUrl, codeVerifier }
```

### Step 2: User Authenticates with Google
```
User → Google Login Page
Google → Redirects to /auth/callback?code=xxx
```

### Step 3: Exchange Code for Tokens
```
Frontend → POST /auth/callback { code, codeVerifier }
Backend:
  1. Verify code_verifier matches code_challenge
  2. Exchange code with Google for:
     - access_token (short-lived, ~1 hour)
     - refresh_token (long-lived, months)
  3. Use access_token to get user info from Google
  4. Create/update user in MongoDB:
     - Store refresh_token (encrypted)
     - Store user info (email, name, picture)
  5. Generate JWT with user info
  6. Return { token: JWT, user: { id, email, name, picture } }
```

### Step 4: Use JWT for Authenticated Requests
```
Frontend → API Request with Header: Authorization: Bearer <JWT>
Backend:
  1. Verify JWT signature
  2. Check expiration
  3. Extract user info
  4. Process request
```

### Step 5: Refresh JWT (when expired)
```
Frontend → POST /auth/refresh (with expired JWT)
Backend:
  1. Verify JWT (even if expired, we check signature)
  2. Get user from MongoDB
  3. Use refresh_token to get new Google access_token
  4. Generate new JWT
  5. Return { token: new JWT, user }
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js (lightweight, Lambda-ready)
- **Database**: MongoDB Atlas (with Mongoose ODM)
- **OAuth**: `googleapis` library
- **JWT**: `jsonwebtoken` library
- **PKCE**: `crypto` (built-in Node.js)
- **Validation**: `zod` (schema validation)
- **Logging**: `winston` (structured logging)

## 📁 Project Structure

```
backend/auth-service/
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB connection
│   │   ├── googleOAuth.ts      # Google OAuth client setup
│   │   └── jwt.ts              # JWT configuration
│   ├── models/
│   │   └── User.ts             # Mongoose User schema
│   ├── services/
│   │   ├── oauthService.ts     # OAuth logic (PKCE, token exchange)
│   │   ├── jwtService.ts       # JWT generation/verification
│   │   └── userService.ts      # User CRUD operations
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT verification middleware
│   │   ├── error.middleware.ts # Error handling
│   │   └── cors.middleware.ts  # CORS configuration
│   ├── routes/
│   │   └── auth.routes.ts      # Auth endpoints
│   ├── utils/
│   │   ├── pkce.ts             # PKCE generation utilities
│   │   ├── encryption.ts       # Refresh token encryption
│   │   └── logger.ts           # Logging utility
│   └── index.ts                # Express app entry point
├── .env.example
├── package.json
├── tsconfig.json
└── PLAN.md (this file)
```

## 🎓 Key Learning Points (For Your Demo)

### 1. Why PKCE?
**Problem**: Authorization code can be intercepted in redirect URL
**Solution**: PKCE adds a "secret handshake"
- Code verifier: Random secret only we know
- Code challenge: Hash of verifier (safe to send)
- Google verifies challenge matches verifier

**Analogy**: Like a secret password you create, but only send a scrambled version. Google unscrambles it to verify it's really you.

### 2. Access Token vs Refresh Token vs JWT

**Access Token (Google)**
- Short-lived (~1 hour)
- Used to call Google APIs (Gmail, Calendar)
- Stored on backend, never sent to frontend

**Refresh Token (Google)**
- Long-lived (months/years)
- Used to get new access tokens
- Stored encrypted in MongoDB
- **NEVER sent to frontend** (security risk!)

**JWT (Our App)**
- Short-lived (1 hour)
- Contains user info (userId, email)
- Sent to frontend for session management
- Used to authenticate API requests

**Hotel Analogy**:
- **Access Token** = Temporary pass to hotel facilities (expires)
- **Refresh Token** = Your ID at front desk (proves who you are, stays at desk)
- **JWT** = Your room key card (expires, but you can get new one with your ID)

### 3. Why Not Store Refresh Token in Frontend?

**Security Risk**: If someone steals your refresh token, they can impersonate you forever.

**Solution**: Store on backend (server-side), encrypted. Frontend only gets short-lived JWTs.

### 4. Stateless Design (Lambda-Ready)

- No server-side sessions
- JWT contains all needed info
- Can scale horizontally (multiple Lambda instances)
- Database is the only shared state

## ✅ Implementation Checklist

- [ ] Set up Express server
- [ ] Configure MongoDB connection
- [ ] Set up Google OAuth client
- [ ] Implement PKCE generation
- [ ] Create User model (Mongoose)
- [ ] Implement `/auth/initiate` endpoint
- [ ] Implement `/auth/callback` endpoint
- [ ] Implement JWT generation
- [ ] Implement refresh token encryption
- [ ] Implement `/auth/refresh` endpoint
- [ ] Implement `/auth/logout` endpoint
- [ ] Add error handling middleware
- [ ] Add CORS middleware
- [ ] Add request validation (Zod)
- [ ] Add structured logging
- [ ] Create `.env.example`
- [ ] Add TypeScript types
- [ ] Test endpoints

## 🚀 Next Steps

After implementing:
1. Test OAuth flow end-to-end
2. Verify refresh token storage
3. Test JWT expiration and refresh
4. Deploy to AWS Lambda (serverless)
5. Connect frontend to test full flow
