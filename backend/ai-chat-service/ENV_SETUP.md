# Environment Variables Setup Guide

## Quick Start

1. **Copy the template:**
   ```bash
   cd backend/ai-chat-service
   cp env.template .env
   ```

2. **Fill in required values** (see below)

3. **Start the service:**
   ```bash
   python -m src.main
   ```

## Required Variables

### 1. MongoDB URI ✅
**Same as other services** - Use the same MongoDB connection string:
```bash
MONGODB_URI=mongodb+srv://keysha_admin:w4CMB3ha8OTjCzQd@cluster.mongodb.net/keysha?retryWrites=true&w=majority
```

### 2. Gemini API Key 🔑
**Get from Google AI Studio:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Create new API key or use existing
4. Copy and paste:
```bash
GEMINI_API_KEY=AIzaSy...your_key_here
```

### 3. Service Token 🔐
**MUST match other services** - Use the same SERVICE_TOKEN:
```bash
SERVICE_TOKEN=14bbe2c4b252dc544c59b93654e949c874e1134be2474bac218142c12c8ee14e
```
(This is the same token used in auth-service and integration-service)

### 4. Service URLs 🌐
**Default ports** (update if different):
```bash
AUTH_SERVICE_URL=http://localhost:3001
ITEM_SERVICE_URL=http://localhost:3002
INTEGRATION_SERVICE_URL=http://localhost:3003
```

### 5. MCP Server Paths 📁
**Relative to ai-chat-service directory:**
```bash
MCP_SERVER_PATH=../mcp-google-workspace
MCP_GAUTH_FILE=../mcp-google-workspace/.gauth.json
MCP_ACCOUNTS_FILE=../mcp-google-workspace/.accounts.json
```

**Note:** You'll need to set up `.gauth.json` and `.accounts.json` in the MCP server directory first (see MCP server README).

### 6. Frontend URL 🌍
**Where your React app runs:**
```bash
FRONTEND_URL=http://localhost:3000
```

## MongoDB Vector Search Setup

**IMPORTANT:** You need to create a Vector Search index in MongoDB Atlas:

1. Go to MongoDB Atlas → Your Cluster → "Search" tab
2. Click "Create Search Index"
3. Configuration:
   - **Database:** `keysha`
   - **Collection:** `user_context`
   - **Index Name:** `vector_index`
   - **Type:** Vector Search
   - **Field:** `embedding`
   - **Dimensions:** `768` (for Google text-embedding-004)
   - **Similarity:** Cosine

4. Wait for index to build (can take a few minutes)

## Example Complete .env File

```bash
# Server
PORT=8000
NODE_ENV=development

# MongoDB (same as other services)
MONGODB_URI=mongodb+srv://keysha_admin:w4CMB3ha8OTjCzQd@cluster.mongodb.net/keysha?retryWrites=true&w=majority

# Gemini API Key (get from Google AI Studio)
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
ITEM_SERVICE_URL=http://localhost:3002
INTEGRATION_SERVICE_URL=http://localhost:3003

# Service Token (must match other services)
SERVICE_TOKEN=14bbe2c4b252dc544c59b93654e949c874e1134be2474bac218142c12c8ee14e

# MCP Server
MCP_SERVER_PATH=../mcp-google-workspace
MCP_GAUTH_FILE=../mcp-google-workspace/.gauth.json
MCP_ACCOUNTS_FILE=../mcp-google-workspace/.accounts.json

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Verification

After setting up `.env`, test the service:

```bash
# Start the service
python -m src.main

# In another terminal, test health endpoint
curl http://localhost:8000/health

# Should return: {"status":"ok","service":"ai-chat-service","version":"1.0.0"}
```

## Troubleshooting

### "MONGODB_URI not set"
- Make sure `.env` file exists in `backend/ai-chat-service/`
- Check that variable name is exactly `MONGODB_URI` (case-sensitive)

### "GEMINI_API_KEY not set"
- Get API key from https://aistudio.google.com/app/apikey
- Make sure it's set in `.env` file

### "Vector search index not found"
- Create the index in MongoDB Atlas (see above)
- Wait for index to finish building

### "Cannot connect to MongoDB"
- Check MongoDB URI is correct
- Verify IP whitelist in MongoDB Atlas
- Check network connectivity
