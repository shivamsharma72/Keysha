"""
MCP Client

Wrapper for MCP service that provides easy access to calendar tools.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from src.services.mcp_service import MCPService

logger = logging.getLogger(__name__)


class MCPClient:
    """
    MCP Client for Calendar Tools
    
    Provides high-level methods to interact with Google Calendar via MCP server.
    """
    
    def __init__(self, mcp_service: MCPService):
        self.mcp_service = mcp_service
        self._tools_cache: Optional[list] = None
    
    async def initialize(self):
        """Initialize MCP connection"""
        await self.mcp_service.start()
        # Cache available tools
        self._tools_cache = await self.mcp_service.list_tools()
        logger.info(f"Available MCP tools: {[t['name'] for t in self._tools_cache]}")
    
    async def list_calendars(self, user_email: str) -> Dict:
        """
        List user's calendars
        
        Args:
            user_email: User's Google email address
        
        Returns:
            List of calendars with metadata
        """
        try:
            result = await self.mcp_service.call_tool(
                "calendar_list",
                {"user_id": user_email}
            )
            return result
        except Exception as e:
            logger.error(f"Failed to list calendars: {e}")
            return {"error": str(e), "calendars": []}
    
    async def get_events(
        self,
        user_email: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        calendar_id: Optional[str] = None
    ) -> Dict:
        """
        Get calendar events
        
        Args:
            user_email: User's Google email address
            start_date: Start date (defaults to today)
            end_date: End date (defaults to 7 days from start)
            calendar_id: Specific calendar ID (defaults to 'primary')
        
        Returns:
            List of calendar events
        """
        try:
            # Default to today if not specified
            if not start_date:
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            if not end_date:
                end_date = start_date + timedelta(days=7)

            # IMPORTANT (Timezone): Users speak in local time (MST/America/Denver),
            # but Google Calendar `timeMin/timeMax` are compared in absolute time.
            # If we send "2026-01-20T23:59:59Z", that is 4:59pm MST on Jan 20,
            # so evening events (e.g. 7pm MST) fall outside the window.
            # Fix: interpret naive datetimes as America/Denver and convert to UTC before appending 'Z'.
            tz = ZoneInfo("America/Denver")

            def to_utc_z(dt: datetime) -> str:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=tz)
                dt_utc = dt.astimezone(ZoneInfo("UTC"))
                # RFC3339 with Z
                return dt_utc.replace(microsecond=0).isoformat().replace("+00:00", "Z")

            time_min_str = to_utc_z(start_date)
            time_max_str = to_utc_z(end_date)
            
            arguments = {
                "user_id": user_email,
                "time_min": time_min_str,
                "time_max": time_max_str,
            }
            
            if calendar_id:
                arguments["calendar_id"] = calendar_id
            
            logger.info(f"Calling MCP tool calendar_get_events with arguments: {arguments}")
            result = await self.mcp_service.call_tool(
                "calendar_get_events",
                arguments
            )
            logger.info(f"MCP tool returned result type: {type(result)}")
            if isinstance(result, dict):
                logger.info(f"Result keys: {result.keys()}")
            return result
        except Exception as e:
            logger.error(f"Failed to get calendar events: {e}", exc_info=True)
            return {"error": str(e), "events": []}
    
    async def create_event(
        self,
        user_email: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        location: Optional[str] = None,
        calendar_id: Optional[str] = None,
        timezone: str = "America/Denver"
    ) -> Dict:
        """
        Create a calendar event

        Args:
            user_email: User's Google email address
            title: Event title
            start_time: Event start time (naive datetime, will be interpreted in timezone)
            end_time: Event end time (naive datetime, will be interpreted in timezone)
            description: Optional description
            location: Optional location
            calendar_id: Specific calendar ID (defaults to 'primary')
            timezone: Timezone for the event (e.g., 'America/Denver' for MST). Defaults to 'America/Denver'.

        Returns:
            Created event details
        """
        try:
            # Format dates in RFC3339 format (required by Google Calendar API)
            # Don't append 'Z' - we'll let the MCP server handle timezone conversion
            # The datetime is naive (no timezone), and the MCP server will interpret it in the specified timezone
            start_time_str = start_time.isoformat()
            end_time_str = end_time.isoformat()
            
            arguments = {
                "user_id": user_email,
                "summary": title,
                "start_time": start_time_str,
                "end_time": end_time_str,
                "timezone": timezone  # Pass timezone to MCP server
            }
            
            if description:
                arguments["description"] = description
            if location:
                arguments["location"] = location
            if calendar_id:
                arguments["calendar_id"] = calendar_id
            
            result = await self.mcp_service.call_tool(
                "calendar_create_event",
                arguments
            )
            return result
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            return {"error": str(e)}
    
    async def delete_event(
        self,
        user_email: str,
        event_id: str,
        calendar_id: Optional[str] = None
    ) -> Dict:
        """
        Delete a calendar event
        
        Args:
            user_email: User's Google email address
            event_id: Google Calendar event ID
            calendar_id: Specific calendar ID (defaults to 'primary')
        
        Returns:
            Deletion result
        """
        try:
            arguments = {
                "user_id": user_email,
                "event_id": event_id,
            }
            
            if calendar_id:
                arguments["calendar_id"] = calendar_id
            
            result = await self.mcp_service.call_tool(
                "calendar_delete_event",
                arguments
            )
            return result
        except Exception as e:
            logger.error(f"Failed to delete calendar event: {e}")
            return {"error": str(e)}
