"""
Chat Models

Request/Response models for chat endpoints.
"""
from pydantic import BaseModel
from typing import Optional, List


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Chat request from frontend"""
    message: str
    conversation_id: Optional[str] = None  # For conversation continuity
    user_id: Optional[str] = None  # Will be extracted from JWT
    conversation_history: Optional[List[ChatMessage]] = None  # Previous messages


class ChatResponse(BaseModel):
    """Chat response to frontend"""
    message: str
    conversation_id: Optional[str] = None
    tools_used: Optional[List[str]] = None  # Which tools were called


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
