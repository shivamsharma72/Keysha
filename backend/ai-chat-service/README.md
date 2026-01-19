# Keysha AI Chat Service

AI-powered chat service with calendar and task management integration.

## Features

- 🤖 LangChain + LangGraph agent
- 📅 Google Calendar integration via MCP
- 📝 Task CRUD operations
- 🧠 MongoDB Vector Search for RAG
- 💬 Natural language chat interface

## Setup

### 1. Install Dependencies

```bash
cd backend/ai-chat-service
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `SERVICE_TOKEN` - Service-to-service auth token (same as other services)

### 3. Run Service

```bash
# Development (with auto-reload)
python -m src.main

# Or using uvicorn directly
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

- `GET /health` - Health check
- `POST /chat` - Chat endpoint (requires Authorization header with JWT)

## Development Phases

- ✅ Phase 1: Foundation (FastAPI + MongoDB setup)
- ⏳ Phase 2: MCP Integration
- ⏳ Phase 3: LangChain Agent
- ⏳ Phase 4: CRUD Integration
- ⏳ Phase 5: Vector Search/RAG
