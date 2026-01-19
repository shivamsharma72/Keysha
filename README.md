## Keysha – AI Productivity Engine (MVP)

Keysha is a context‑aware productivity app that combines:
- **React + Vite + Tailwind** frontend (Vercel‑ready)
- **Node.js (TypeScript)** microservices for Auth, Items, and Google Calendar integration
- **Python FastAPI + LangChain + Gemini** AI chat service using MCP to talk to Google Workspace

This README is for someone who wants to **clone and run the project locally**.

---

## 1. Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB Atlas** cluster (or any MongoDB URI)
- **Google Cloud project** with:
  - OAuth client (for web app)
  - Calendar API enabled
  - Gmail API enabled (for MCP Gmail tools)
- **Git** (to clone and push)

---

## 2. Clone the Repo

```bash
git clone <YOUR_REPO_URL> keysha
cd keysha
```

> After you create a GitHub repo (see section 7), replace `<YOUR_REPO_URL>` with that URL.

---

## 3. Environment Variables (Overview)

Each service has its own `env.template` or `.env.example`:

- `backend/auth-service/env.template`
- `backend/item-service/env.template`
- `backend/integration-service/env.template`
- `backend/ai-chat-service/env.template`
- `backend/mcp-google-workspace/.gauth.json` & `.accounts.json`
- `frontend/.env` (Vite `VITE_...` variables)

**Step‑by‑step:**

1. **Auth Service**
   ```bash
   cd backend/auth-service
   cp env.template .env
   # Fill in:
   # - MONGODB_URI
   # - JWT_SECRET
   # - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
   # - SERVICE_TOKEN (shared secret for internal calls)
   ```

2. **Item Service**
   ```bash
   cd backend/item-service
   cp env.template .env
   # Fill in:
   # - MONGODB_URI (same cluster)
   # - JWT_SECRET (same as auth-service)
   # - SERVICE_TOKEN
   ```

3. **Integration Service**
   ```bash
   cd backend/integration-service
   cp env.template .env
   # Fill in:
   # - MONGODB_URI
   # - JWT_SECRET
   # - SERVICE_TOKEN
   # - AUTH_SERVICE_URL, ITEM_SERVICE_URL
   ```

4. **AI Chat Service (Python)**
   ```bash
   cd backend/ai-chat-service
   cp env.template .env
   # Fill in:
   # - MONGODB_URI
   # - GEMINI_API_KEY
   # - JWT_SECRET (same as auth-service)
   # - AUTH_SERVICE_URL, ITEM_SERVICE_URL, INTEGRATION_SERVICE_URL
   # - SERVICE_TOKEN
   # - MCP_SERVER_PATH, MCP_GAUTH_FILE, MCP_ACCOUNTS_FILE
   ```

5. **MCP Google Workspace**
   - `backend/mcp-google-workspace/.gauth.json`  
     Use the OAuth client from Google Cloud (Desktop / Web, redirect `http://localhost:4100/code`).
   - `backend/mcp-google-workspace/.accounts.json`  
     List allowed emails (or leave empty for dynamic mode).

6. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env   # if present, otherwise create .env
   # Fill in:
   # - VITE_API_BASE_URL (or individual service URLs)
   # - VITE_GOOGLE_CLIENT_ID
   ```

---

## 4. Install Dependencies

From the project root:

```bash
# Frontend
cd frontend
npm install

# Auth service
cd ../backend/auth-service
npm install

# Item service
cd ../item-service
npm install

# Integration service
cd ../integration-service
npm install

# MCP Google Workspace
cd ../mcp-google-workspace
npm install

# AI Chat Service (Python)
cd ../ai-chat-service
pip install -r requirements.txt
```

---

## 5. Run Services Locally

Open **multiple terminals** and run:

1. **Auth Service**
   ```bash
   cd backend/auth-service
   npm run dev
   # Default: http://localhost:3001
   ```

2. **Item Service**
   ```bash
   cd backend/item-service
   npm run dev
   # Default: http://localhost:3002
   ```

3. **Integration Service**
   ```bash
   cd backend/integration-service
   npm run dev
   # Default: http://localhost:3003
   ```

4. **MCP Google Workspace Server**
   ```bash
   cd backend/mcp-google-workspace
   npm run build
   npm start
   # Runs as an MCP stdio server (no HTTP port – used by AI chat service)
   ```

5. **AI Chat Service**
   ```bash
   cd backend/ai-chat-service
   python -m src.main
   # Default: http://localhost:8000
   ```

6. **Frontend**
   ```bash
   cd frontend
   npm run dev
   # Default: http://localhost:5173
   ```

---

## 6. Basic Flow to Test Locally

1. Open the frontend dev URL (e.g. `http://localhost:5173`).
2. Click **Sign in with Google** and complete OAuth.
3. On the dashboard:
   - Create an Action/Reminder/Event.
   - Click **Refresh** or **Sync** to sync with Google Calendar.
4. Open the **Chat** page:
   - Ask: “What do I have tomorrow?”
   - Ask: “Create a reminder to call mom at 5pm tomorrow.”
   - Ask: “Delete the ‘Make laundry’ event tomorrow.”

If all env vars and services are configured correctly, calendar + Keysha items should stay in sync.

---

## 7. Create a New GitHub Repo and Push

Run these commands **from the project root** (`/Users/shivamsharma/Desktop/Keysha-clone`), replacing placeholders:

```bash
# 1. Initialize git (if not already)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial Keysha MVP commit"

# 4. Create a new empty repo on GitHub
#    - Go to GitHub → New repository → name it e.g. "keysha-mvp"
#    - DO NOT add README / .gitignore there (we already have them locally)

# 5. Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 6. Push main branch
git branch -M main
git push -u origin main
```

After this, your full Keysha project is on GitHub. You can then:
- Connect the **frontend** (`/frontend`) to Vercel.
- Deploy each backend service to AWS (Elastic Beanstalk, Lambda, etc.).

---

## 8. Where to Go Next

- **Vercel deploy** for frontend.
- **AWS deploy** for each backend service.
- Add monitoring/logging (CloudWatch, Sentry).
- Harden OAuth scopes and secrets for production.

