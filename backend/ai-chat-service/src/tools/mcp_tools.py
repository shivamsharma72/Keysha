"""
MCP LangChain Tools

Wraps MCP calendar tools as LangChain tools for the agent to use.
"""
import logging
from typing import Optional, List
from datetime import datetime, timedelta
from collections import defaultdict
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from src.tools.mcp_client import MCPClient

logger = logging.getLogger(__name__)


class CalendarListInput(BaseModel):
    """Input for calendar list tool"""
    user_email: str = Field(description="User's Google email address")


class CalendarGetEventsInput(BaseModel):
    """Input for calendar get events tool"""
    user_email: str = Field(description="User's Google email address")
    start_date: Optional[str] = Field(
        default=None,
        description="Start date in ISO format (e.g., 2024-01-18T00:00:00). Defaults to today."
    )
    end_date: Optional[str] = Field(
        default=None,
        description="End date in ISO format (e.g., 2024-01-25T23:59:59). Defaults to 7 days from start."
    )
    calendar_id: Optional[str] = Field(
        default="primary",
        description="Calendar ID (defaults to 'primary')"
    )


class CalendarCreateEventInput(BaseModel):
    """Input for calendar create event tool"""
    user_email: str = Field(description="User's Google email address")
    title: str = Field(description="Event title")
    start_time: str = Field(description="Start time in ISO format (e.g., 2024-01-18T10:00:00). Times should be in the user's local timezone (MST/America/Denver).")
    end_time: str = Field(description="End time in ISO format (e.g., 2024-01-18T11:00:00). Times should be in the user's local timezone (MST/America/Denver).")
    description: Optional[str] = Field(default=None, description="Event description")
    location: Optional[str] = Field(default=None, description="Event location")
    calendar_id: Optional[str] = Field(default="primary", description="Calendar ID (defaults to 'primary')")
    timezone: Optional[str] = Field(default="America/Denver", description="Timezone for the event (e.g., 'America/Denver' for MST). Defaults to 'America/Denver'.")


class CalendarDeleteEventInput(BaseModel):
    """Input for calendar delete event tool"""
    user_email: str = Field(description="User's Google email address")
    event_id: str = Field(description="Google Calendar event ID")
    calendar_id: Optional[str] = Field(default="primary", description="Calendar ID (defaults to 'primary')")


class CalendarListTool(BaseTool):
    """Tool to list user's calendars"""
    name: str = "calendar_list"
    description: str = """List all calendars accessible by the user. 
    Use this to see available calendars before querying events.
    Returns calendar metadata including names, IDs, and timezone information."""
    args_schema: type = CalendarListInput
    
    def __init__(self, mcp_client: MCPClient, **kwargs):
        super().__init__(**kwargs)
        # Store mcp_client as a private attribute to avoid Pydantic validation issues
        object.__setattr__(self, '_mcp_client', mcp_client)
    
    def _run(self, user_email: str) -> str:
        """Synchronous run (not used in async context)"""
        raise NotImplementedError("Use async _arun instead")
    
    async def _arun(self, user_email: str) -> str:
        """List calendars"""
        try:
            result = await self._mcp_client.list_calendars(user_email)
            if "error" in result:
                return f"Error: {result['error']}"
            
            calendars = result.get("calendars", [])
            if not calendars:
                return "No calendars found."
            
            # Format response
            calendar_list = []
            for cal in calendars:
                calendar_list.append(
                    f"- {cal.get('summary', 'Unknown')} (ID: {cal.get('id', 'N/A')})"
                )
            
            return "\n".join(calendar_list)
        except Exception as e:
            logger.error(f"Calendar list failed: {e}")
            return f"Error listing calendars: {str(e)}"


class CalendarGetEventsTool(BaseTool):
    """Tool to get calendar events"""
    name: str = "calendar_get_events"
    description: str = """Get calendar events for a user within a date range.
    Use this to see what's on the user's calendar today, this week, or any date range.
    Returns event details including title, time, location, and description."""
    args_schema: type = CalendarGetEventsInput
    
    def __init__(self, mcp_client: MCPClient, **kwargs):
        super().__init__(**kwargs)
        object.__setattr__(self, '_mcp_client', mcp_client)
    
    def _run(self, user_email: str, start_date: Optional[str] = None, end_date: Optional[str] = None, calendar_id: str = "primary") -> str:
        """Synchronous run (not used in async context)"""
        raise NotImplementedError("Use async _arun instead")
    
    async def _arun(
        self,
        user_email: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        calendar_id: str = "primary"
    ) -> str:
        """Get calendar events"""
        try:
            logger.info(f"Getting calendar events for {user_email}, start_date={start_date}, end_date={end_date}")
            
            # Parse dates (handle dict or string format)
            if start_date:
                if isinstance(start_date, dict):
                    start_date = start_date.get("dateTime") or start_date.get("date") or str(start_date)
                start_date = str(start_date).replace('Z', '+00:00')
                start_dt = datetime.fromisoformat(start_date)
            else:
                start_dt = None
            
            if end_date:
                if isinstance(end_date, dict):
                    end_date = end_date.get("dateTime") or end_date.get("date") or str(end_date)
                end_date = str(end_date).replace('Z', '+00:00')
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = None
            
            logger.info(f"Calling MCP client get_events with start_dt={start_dt}, end_dt={end_dt}")
            result = await self._mcp_client.get_events(
                user_email,
                start_dt,
                end_dt,
                calendar_id if calendar_id != "primary" else None
            )
            
            # Handle different response formats
            events = []
            if isinstance(result, list):
                logger.info(f"MCP returned events as list with {len(result)} items")
                # MCP returned events as a list directly
                events = result
                logger.info(f"MCP returned events as list with {len(events)} items")
            elif isinstance(result, dict):
                # Check for error first
                if "error" in result:
                    logger.error(f"MCP returned error: {result['error']}")
                    return f"Error: {result['error']}"
                
                # MCP might return events nested under different keys
                events = result.get("events", [])
                if not events and "items" in result:
                    events = result.get("items", [])
                logger.info(f"Found {len(events)} events in dict response")
            else:
                logger.warning(f"Unexpected result type: {type(result)}")
                return f"Error: Unexpected response format from calendar service"
            
            if not events:
                return "No events found in the specified time range."
            
            # Format response with dates clearly shown
            # Group events by date for better readability
            events_by_date = defaultdict(list)
            
            for event in events:
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date", "Unknown"))
                end = event.get("end", {}).get("dateTime", event.get("end", {}).get("date", "Unknown"))
                title = event.get("summary", "Untitled Event")
                event_id = event.get("id", "")
                location = event.get("location", "")
                desc = event.get("description", "")
                
                # Extract date from start time for grouping
                event_date = "Unknown"
                if start and start != "Unknown":
                    try:
                        # Parse ISO format date
                        if 'T' in start:
                            event_date = start.split('T')[0]  # Get YYYY-MM-DD part
                        else:
                            event_date = start  # Already just date
                    except:
                        event_date = start
                
                # Format time (extract time portion if datetime)
                time_str = start
                if 'T' in str(start):
                    try:
                        dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                        time_str = dt.strftime("%I:%M %p")  # e.g., "04:00 PM"
                        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
                        end_time_str = end_dt.strftime("%I:%M %p")
                        time_str = f"{time_str} - {end_time_str}"
                    except:
                        pass
                
                event_str = f"  • {title}"
                # Include event ID so the agent can delete/update the correct event
                if event_id:
                    event_str += f"\n    ID: {event_id}"
                event_str += f"\n    Time: {time_str}"
                if location:
                    event_str += f"\n    Location: {location}"
                if desc:
                    event_str += f"\n    Description: {desc[:100]}..."
                
                events_by_date[event_date].append(event_str)
            
            # Format output grouped by date
            if not events_by_date:
                return "No events found in the specified time range."
            
            formatted_output = []
            # Sort dates
            sorted_dates = sorted(events_by_date.keys())
            for date in sorted_dates:
                # Format date nicely (e.g., "January 22, 2026")
                try:
                    date_obj = datetime.fromisoformat(date)
                    formatted_date = date_obj.strftime("%A, %B %d, %Y")  # e.g., "Wednesday, January 22, 2026"
                except:
                    formatted_date = date
                
                formatted_output.append(f"\n{formatted_date}:")
                formatted_output.extend(events_by_date[date])
            
            result = "\n".join(formatted_output)
            logger.info(f"Formatted {len(events)} events across {len(events_by_date)} dates")
            return result
        except Exception as e:
            logger.error(f"Get calendar events failed: {e}", exc_info=True)
            return f"Error getting calendar events: {str(e)}"


class CalendarCreateEventTool(BaseTool):
    """Tool to create calendar events"""
    name: str = "calendar_create_event"
    description: str = """Create a new event in the user's Google Calendar.
    Use this when the user wants to schedule a meeting, appointment, or reminder.
    Requires title, start time, and end time."""
    args_schema: type = CalendarCreateEventInput
    
    def __init__(self, mcp_client: MCPClient, **kwargs):
        super().__init__(**kwargs)
        object.__setattr__(self, '_mcp_client', mcp_client)
    
    def _run(self, user_email: str, title: str, start_time: str, end_time: str, description: Optional[str] = None, location: Optional[str] = None, calendar_id: str = "primary") -> str:
        """Synchronous run (not used in async context)"""
        raise NotImplementedError("Use async _arun instead")
    
    async def _arun(
        self,
        user_email: str,
        title: str,
        start_time: str,
        end_time: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        calendar_id: str = "primary",
        timezone: str = "America/Denver"
    ) -> str:
        """Create calendar event"""
        try:
            # Ensure start_time and end_time are strings
            # Gemini might pass them as dicts or strings
            if isinstance(start_time, dict):
                # If it's a dict, try to extract the datetime value
                start_time = start_time.get("dateTime") or start_time.get("date") or str(start_time)
            if isinstance(end_time, dict):
                end_time = end_time.get("dateTime") or end_time.get("date") or str(end_time)
            
            # Convert to string if not already
            start_time_str = str(start_time)
            end_time_str = str(end_time)
            
            # Parse times (handle both ISO format with and without Z)
            # Remove Z if present - we'll let the MCP server handle timezone conversion
            start_time_clean = start_time_str.replace('Z', '')
            end_time_clean = end_time_str.replace('Z', '')
            
            # Parse as naive datetime (no timezone) - the MCP server will interpret it in the specified timezone
            start_dt = datetime.fromisoformat(start_time_clean)
            end_dt = datetime.fromisoformat(end_time_clean)
            
            result = await self._mcp_client.create_event(
                user_email,
                title,
                start_dt,
                end_dt,
                description,
                location,
                calendar_id if calendar_id != "primary" else None,
                timezone
            )
            
            if "error" in result:
                return f"Error creating event: {result['error']}"
            
            event_id = result.get("id", "Unknown")
            return f"✅ Event '{title}' created successfully! Event ID: {event_id}"
        except Exception as e:
            logger.error(f"Create calendar event failed: {e}")
            return f"Error creating event: {str(e)}"


class CalendarDeleteEventTool(BaseTool):
    """Tool to delete calendar events"""
    name: str = "calendar_delete_event"
    description: str = """Delete an event from the user's Google Calendar.
    Use this when the user wants to cancel or remove an event.
    Requires the event ID (from calendar_get_events)."""
    args_schema: type = CalendarDeleteEventInput
    
    def __init__(self, mcp_client: MCPClient, **kwargs):
        super().__init__(**kwargs)
        object.__setattr__(self, '_mcp_client', mcp_client)
    
    def _run(self, user_email: str, event_id: str, calendar_id: str = "primary") -> str:
        """Synchronous run (not used in async context)"""
        raise NotImplementedError("Use async _arun instead")
    
    async def _arun(self, user_email: str, event_id: str, calendar_id: str = "primary") -> str:
        """Delete calendar event"""
        try:
            result = await self._mcp_client.delete_event(
                user_email,
                event_id,
                calendar_id if calendar_id != "primary" else None
            )
            
            if "error" in result:
                return f"Error deleting event: {result['error']}"
            
            return f"✅ Event deleted successfully!"
        except Exception as e:
            logger.error(f"Delete calendar event failed: {e}")
            return f"Error deleting event: {str(e)}"


def get_mcp_calendar_tools(mcp_client: MCPClient) -> List[BaseTool]:
    """
    Get all MCP calendar tools as LangChain tools
    
    Args:
        mcp_client: Initialized MCP client
    
    Returns:
        List of LangChain tools
    """
    return [
        CalendarListTool(mcp_client),
        CalendarGetEventsTool(mcp_client),
        CalendarCreateEventTool(mcp_client),
        CalendarDeleteEventTool(mcp_client),
    ]
