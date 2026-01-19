"""
Item Service LangChain Tools

Allows the agent to create Actions/Reminders/Events in Keysha via item-service.
"""
import logging
from typing import Optional, Dict, Any, Type
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from src.services.item_service import ItemServiceClient

logger = logging.getLogger(__name__)


class ItemCreateInput(BaseModel):
    """Input schema for creating an item in Keysha"""
    user_id: str = Field(description="User ID from JWT")
    item_type: str = Field(description="Type of item: action | reminder | event")
    title: str = Field(description="Title of the item")
    description: Optional[str] = Field(default=None, description="Description of the item")
    location: Optional[str] = Field(default=None, description="Location for the item")
    start_time: Optional[str] = Field(default=None, description="Start time (ISO) for events")
    end_time: Optional[str] = Field(default=None, description="End time (ISO) for events")
    reminder_time: Optional[str] = Field(default=None, description="Reminder time (ISO) for reminders")
    priority: Optional[str] = Field(default=None, description="Priority level (One|Two|Three)")
    category: Optional[str] = Field(default=None, description="Category (Work|Personal|Health)")
    execution_mode: Optional[str] = Field(default=None, description="Execution mode (Focus|Flow|Admin)")
    duration_minutes: Optional[int] = Field(default=None, description="Duration in minutes (for actions)")


class ItemCreateTool(BaseTool):
    """Tool to create an item (action/reminder/event) via item-service"""
    name: str = "item_create"
    description: str = """Create an item in Keysha (action/reminder/event).
Use this when the user says things like "remind me to...", "create a task...", or "schedule an event".
If required times are missing (start/end for events, reminder_time for reminders), ask a clarifying question."""
    args_schema: Type[BaseModel] = ItemCreateInput

    def __init__(self, item_client: ItemServiceClient, jwt_token: str, **kwargs):
        super().__init__(**kwargs)
        object.__setattr__(self, "_item_client", item_client)
        object.__setattr__(self, "_jwt_token", jwt_token)

    def _run(self, *args, **kwargs):
        raise NotImplementedError("Use async _arun instead")

    async def _arun(
        self,
        user_id: str,
        item_type: str,
        title: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        reminder_time: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        execution_mode: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        user_email: Optional[str] = None,  # Ignored, tool uses user_id
    ) -> str:
        try:
            itype = item_type.lower().strip()
            if itype not in ["action", "reminder", "event"]:
                return "Error: item_type must be one of action | reminder | event."

            # Basic required fields per type
            if itype == "event":
                if not start_time or not end_time:
                    return "I need start_time and end_time (ISO) to create an event."
            if itype == "reminder":
                if not reminder_time:
                    return "I need reminder_time (ISO) to create a reminder."

            # The item-service schema expects non-null strings for several fields.
            # Provide safe defaults to avoid 400 errors when fields are omitted.
            payload: Dict[str, Any] = {
                "type": itype,
                "title": title,
                "description": description or "",
                "location": location or "",
                "priority": priority or "Two",
                "category": category or "Personal",
                "executionMode": execution_mode or "Flow",
                "userId": user_id,
            }

            if itype == "event":
                payload["startDate"] = start_time
                payload["endDate"] = end_time
            if itype == "reminder":
                payload["reminderTime"] = reminder_time
            if itype == "action":
                payload["duration"] = duration_minutes

            result = await self._item_client.create_item(self._jwt_token, payload)
            if "error" in result:
                return f"Error creating item: {result.get('error')}"

            item_id = result.get("_id") or result.get("id") or "unknown"
            return f"✅ Created {itype} '{title}' (id: {item_id})"
        except Exception as e:
            logger.error(f"Item create failed: {e}", exc_info=True)
            return f"Error creating item: {str(e)}"


def get_item_tools(item_client: ItemServiceClient, jwt_token: str):
    """Return list of item-service tools"""
    return [
        ItemCreateTool(item_client=item_client, jwt_token=jwt_token),
    ]
