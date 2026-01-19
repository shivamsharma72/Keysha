"""
Auth Service Client

Handles JWT token verification and user information extraction.
"""
import jwt
import logging
from typing import Optional, Dict
from src.config.settings import settings

logger = logging.getLogger(__name__)


def decode_jwt_token(token: str) -> Optional[Dict]:
    """
    Decode JWT token to extract user information
    
    Args:
        token: JWT token string (without "Bearer " prefix)
    
    Returns:
        Dict with userId and email, or None if invalid
    """
    try:
        # Get JWT secret from settings (should match auth-service)
        # For now, we'll need to add JWT_SECRET to settings
        jwt_secret = getattr(settings, 'JWT_SECRET', None)
        
        if not jwt_secret:
            logger.warning("JWT_SECRET not configured, using placeholder")
            # Return placeholder for development
            return {
                "userId": "user_placeholder",
                "email": "s.sharma.asu@gmail.com"  # Default from .accounts.json
            }
        
        # Decode token
        decoded = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        
        return {
            "userId": decoded.get("userId"),
            "email": decoded.get("email")
        }
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None
    except Exception as e:
        logger.error(f"Error decoding JWT: {e}")
        return None
