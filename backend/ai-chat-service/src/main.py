"""
AI Chat Service - Main Entry Point

FastAPI application for AI-powered chat with calendar and task management.
"""
import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from typing import Optional, Dict

from src.config.settings import settings
from src.models.chat import ChatRequest, ChatResponse, ErrorResponse
from src.services.vector_store import VectorStore
from src.services.mcp_service import MCPService
from src.tools.mcp_client import MCPClient
from src.agent.agent import KeyshaAgent
from src.services.auth_service import decode_jwt_token

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
vector_store: Optional[VectorStore] = None
mcp_service: Optional[MCPService] = None
mcp_client: Optional[MCPClient] = None
agent: Optional[KeyshaAgent] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global vector_store, mcp_service, mcp_client
    
    # Startup
    logger.info("🚀 Starting AI Chat Service...")
    
    try:
        # Initialize vector store
        vector_store = VectorStore(settings.MONGODB_URI)
        await vector_store.initialize()
        logger.info("✅ Vector store initialized")
        
        # Initialize MCP service (Phase 2)
        try:
            mcp_service = MCPService(
                server_path=settings.MCP_SERVER_PATH,
                gauth_file=settings.MCP_GAUTH_FILE,
                accounts_file=settings.MCP_ACCOUNTS_FILE,
                credentials_dir=str(Path(settings.MCP_SERVER_PATH) / ".credentials")
            )
            await mcp_service.start()
            
            # Initialize MCP client
            mcp_client = MCPClient(mcp_service)
            await mcp_client.initialize()
            logger.info("✅ MCP service initialized")
        except Exception as e:
            logger.warning(f"⚠️ MCP service initialization failed (will retry later): {e}")
            # Don't fail startup if MCP fails - it's optional for Phase 1
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Chat Service...")
    if mcp_client:
        try:
            await mcp_service.stop()
        except Exception as e:
            logger.error(f"Error stopping MCP service: {e}")
    if vector_store:
        await vector_store.close()


# Create FastAPI app
app = FastAPI(
    title="Keysha AI Chat Service",
    description="AI-powered chat with calendar and task management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_user_info(authorization: str = Header(None)) -> Dict[str, str]:
    """
    Extract user info (userId and email) from JWT token
    
    Returns:
        Dict with 'userId' and 'email'
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    user_info = decode_jwt_token(token)
    
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_info


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-chat-service",
        "version": "1.0.0"
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_info: Dict[str, str] = Depends(get_user_info),
    authorization: str = Header(None)
):
    """
    Chat endpoint
    
    Receives user message and returns AI response using LangChain agent.
    """
    user_id = user_info["userId"]
    user_email = user_info["email"]
    
    logger.info(f"Chat request from user {user_id} ({user_email}): {request.message}")
    # Extract raw JWT (without Bearer prefix) to forward to item-service tools
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    
    # Check if MCP client is available
    if not mcp_client:
        return ChatResponse(
            message="⚠️ MCP service is not available. Please check server logs.",
            conversation_id=request.conversation_id
        )
    
    try:
        # Create agent instance for this user (or reuse if exists)
        # For now, create new instance each time (we can optimize later)
        agent = KeyshaAgent(mcp_client, user_email, jwt_token=token or "")
        
        # Get conversation history (for now, empty - we'll add persistence later)
        conversation_history = request.conversation_history or []
        
        # Get AI response
        ai_response = await agent.chat(
            request.message,
            conversation_history
        )
        
        return ChatResponse(
            message=ai_response,
            conversation_id=request.conversation_id
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            message=f"I encountered an error: {str(e)}. Please try again.",
            conversation_id=request.conversation_id
        )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Keysha AI Chat Service",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "chat": "/chat"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.NODE_ENV == "development"
    )
