"""
Item Service Client

Provides async helpers to call the item-service (Actions, Reminders, Events).
"""
import httpx
from typing import Dict, Any
from src.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class ItemServiceClient:
    """
    Thin HTTP client for item-service endpoints.
    Uses the user's JWT for authorization.
    """

    def __init__(self):
        self.base_url = settings.ITEM_SERVICE_URL.rstrip("/")

    async def create_item(self, jwt_token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an item (action/reminder/event) in Keysha.

        Args:
            jwt_token: User's JWT (Authorization header).
            payload: Item payload as expected by item-service.

        Returns:
            JSON response from item-service.
        """
        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}/items"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"ItemService create_item failed ({resp.status_code}): {resp.text}")
                return {"error": resp.text, "status": resp.status_code}
            return resp.json()
