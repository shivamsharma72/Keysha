# OAuth Architecture - Why Google Client ID is NOT in Frontend

## 🏗️ Current Architecture (Secure Pattern)

### How OAuth Works in Keysha

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend    │         │   Google    │
│  (React)    │         │  (Node.js)   │         │   OAuth     │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │                        │
      │  1. POST /auth/initiate │                        │
      │────────────────────────>│                        │
      │                         │                        │
      │                         │  2. Generate OAuth URL │
      │                         │     (uses Client ID)   │
      │                         │                        │
      │  3. Return authUrl      │                        │
      │<────────────────────────│                        │
      │                         │                        │
      │  4. Redirect to Google  │                        │
      │─────────────────────────────────────────────────>│
      │                         │                        │
      │  5. User logs in        │                        │
      │<─────────────────────────────────────────────────│
      │                         │                        │
      │  6. Redirect with code  │                        │
      │<─────────────────────────────────────────────────│
      │                         │                        │
      │  7. POST /auth/callback │                        │
      │     (code + verifier)   │                        │
      │────────────────────────>│                        │
      │                         │                        │
      │                         │  8. Exchange code     │
      │                         │     for tokens        │
      │                         │──────────────────────>│
      │                         │                        │
      │                         │  9. Return JWT        │
      │  10. Receive JWT         │                        │
      │<────────────────────────│                        │
```

## 🔐 Why Google Client ID is on Backend, NOT Frontend

### Security Reasons

1. **Client Secret Protection**
   - OAuth requires a Client Secret (like a password)
   - **NEVER expose secrets in frontend code** (anyone can see it)
   - Backend keeps secrets secure on the server

2. **Token Exchange**
   - Exchanging authorization code for tokens requires the Client Secret
   - This happens on the backend, not frontend
   - Frontend never sees sensitive credentials

3. **PKCE Flow**
   - Backend generates code verifier and challenge
   - Backend constructs the OAuth URL with all parameters
   - Frontend just redirects to the URL provided

### What Frontend Does

✅ **Frontend Responsibilities:**
- Calls backend to get OAuth URL
- Redirects user to Google login
- Receives callback with authorization code
- Sends code to backend for token exchange
- Stores JWT token (not refresh token)

❌ **Frontend Does NOT:**
- Store Google Client ID
- Store Client Secret
- Directly communicate with Google OAuth API
- Handle token exchange

### What Backend Does

✅ **Backend Responsibilities:**
- Stores Google Client ID (safe on server)
- Stores Client Secret (NEVER exposed)
- Generates OAuth URLs with PKCE
- Exchanges authorization code for tokens
- Stores refresh tokens securely
- Issues JWTs to frontend

## 📝 Environment Variables

### Frontend `.env` (What We Need)
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001/auth
VITE_ITEM_SERVICE_URL=http://localhost:3001/items
VITE_AI_SERVICE_URL=http://localhost:8000
```

**No Google Client ID needed!** ✅

### Backend `.env` (What Backend Needs)
```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## 🎓 Key Learning Points

1. **Separation of Concerns**
   - Frontend = UI and user interaction
   - Backend = Security and business logic

2. **Never Trust the Client**
   - Frontend code is public (anyone can inspect it)
   - Secrets must stay on the server

3. **OAuth Best Practice**
   - Authorization Code Flow with PKCE
   - Backend handles all sensitive operations
   - Frontend only redirects and receives tokens

## 🔄 Alternative (Less Secure) Pattern

Some apps put Client ID in frontend for "implicit flow" or "authorization code flow without PKCE", but:
- ❌ Less secure
- ❌ Refresh tokens can't be stored securely
- ❌ Not recommended for production

Our architecture follows **OAuth 2.0 best practices** ✅
