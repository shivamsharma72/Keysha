"""
Configuration Settings

Loads environment variables and provides typed settings for the application.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server
    PORT: int = 8000
    NODE_ENV: str = "development"
    
    # MongoDB
    MONGODB_URI: str
    
    # Gemini API
    GEMINI_API_KEY: str
    
    # Service URLs
    AUTH_SERVICE_URL: str = "http://localhost:3001"
    ITEM_SERVICE_URL: str = "http://localhost:3002"
    INTEGRATION_SERVICE_URL: str = "http://localhost:3003"
    
    # Service Token
    SERVICE_TOKEN: str
    
    # JWT Secret (for decoding tokens - should match auth-service)
    JWT_SECRET: Optional[str] = None
    
    # MCP Server
    MCP_SERVER_PATH: str = "../mcp-google-workspace"
    MCP_GAUTH_FILE: str = "../mcp-google-workspace/.gauth.json"
    MCP_ACCOUNTS_FILE: str = "../mcp-google-workspace/.accounts.json"
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
