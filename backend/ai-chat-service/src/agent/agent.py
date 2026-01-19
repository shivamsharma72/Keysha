"""
LangChain Agent with MCP Tools

Creates a LangChain agent that can use MCP calendar tools to interact with Google Calendar.
"""
import logging
from typing import List, Optional
from datetime import datetime, timedelta

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough

from src.config.settings import settings
from src.tools.mcp_client import MCPClient
from src.tools.mcp_tools import get_mcp_calendar_tools

logger = logging.getLogger(__name__)


class KeyshaAgent:
    """
    Keysha AI Agent
    
    Uses Gemini 2.0 Flash to understand user queries and execute calendar operations
    via MCP tools. The agent maintains conversation context and can perform:
    - List calendars
    - Get calendar events
    - Create calendar events
    - Delete calendar events
    """
    
    def __init__(self, mcp_client: MCPClient, user_email: str, jwt_token: str):
        """
        Initialize the agent
        
        Args:
            mcp_client: Initialized MCP client for calendar operations
            user_email: User's Google email address
        """
        self.mcp_client = mcp_client
        self.user_email = user_email
        
        # Initialize Gemini model
        # Using gemini-3-flash - latest model with function calling support (REQUIRED for MCP tools)
        # Rate limits: Check Google AI Studio for current limits
        # 
        # IMPORTANT: Gemma models (gemma-3-27b-it, etc.) do NOT support function calling,
        # so they cannot use MCP tools. Only Gemini models support function calling.
        # 
        # Alternative models that support function calling:
        # - gemini-2.5-flash (stable, good rate limits)
        # - gemini-2.5-flash-lite (10 RPM free tier, faster)
        # - gemini-2.5-pro (more capable, same rate limits)
        # - gemini-2.0-flash-exp (experimental)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7,
            convert_system_message_to_human=True
        )
        
        # Get tools: MCP calendar + item-service CRUD
        from src.tools.item_tools import get_item_tools
        from src.services.item_service import ItemServiceClient

        self.item_client = ItemServiceClient()
        self.tools = [
            *get_mcp_calendar_tools(mcp_client),
            *get_item_tools(self.item_client, jwt_token),
        ]
        
        # For Gemini, we'll use the tools directly in the invoke call
        # bind_tools might not be available in this version
        self.llm_with_tools = self.llm
        
        # Create system prompt
        self.system_prompt = self._create_system_prompt()
        
        # Create agent chain
        self.agent_chain = self._create_agent_chain()
    
    def _create_system_prompt(self) -> str:
        """Create system prompt for the agent"""
        from datetime import datetime, timedelta
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        tomorrow = (now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).strftime("%Y-%m-%d")
        current_year = now.year
        
        return f"""You are Keysha, an AI productivity assistant that helps users manage their calendar and tasks.

**CURRENT DATE CONTEXT:**
- Today's date: {today} (Year: {current_year})
- Tomorrow's date: {tomorrow}
- Current time: {now.strftime("%H:%M")}

Your capabilities:
- View and manage Google Calendar events
- Answer questions about the user's schedule
- Create new calendar events
- Delete calendar events
- Create Keysha items (Actions, Reminders, Events) via item-service
- Provide helpful tips about productivity

User Information:
- Email: {self.user_email}
- You can access their Google Calendar through the available tools

Guidelines:
- Be helpful, friendly, and concise
- **IMPORTANT: When the user asks about their calendar, events, or schedule, you MUST use the calendar_get_events tool to get real-time information. Do not guess or make up events.**
- **CRITICAL: When showing events from calendar_get_events, you MUST show ALL events returned by the tool, not just today's events. If the user asks for "this week" or "all events", show every event in the date range.**
- **CRITICAL: REMEMBER WHAT YOU JUST DID - If you just created an event, that event now exists in the calendar. If the user asks about events after you created one, use calendar_get_events to see the updated calendar including the event you just created.**
- **CRITICAL: CONVERSATION CONTEXT - Pay close attention to the conversation history:**
  * If the user mentioned "tomorrow" in a previous message, and then says "tomorrow" again or "add one more", they mean the SAME "tomorrow" (date: {tomorrow})
  * If you just created an event for a specific date, remember that date for follow-up questions
  * When the user says "add one more" or "add another", use the SAME date/time context from the previous message
- **CRITICAL DATE RULES:**
  * "Today" means {today} (NOT 2024 or any other year - use {current_year})
  * "Tomorrow" means {tomorrow} (date: {tomorrow})
  * "This week" means from {today} to 7 days later (use start_date={today}T00:00:00, end_date={today}T23:59:59 + 7 days)
  * When creating events, ALWAYS use dates in {current_year}, not 2024
  * **TIMEZONE: The user is in MST (Mountain Standard Time, America/Denver, UTC-7). When the user says "4pm", they mean 4pm MST, not UTC.**
  * Use ISO format: YYYY-MM-DDTHH:MM:SS (e.g., {tomorrow}T16:00:00 for tomorrow at 4 PM MST)
  * **IMPORTANT: Times are in the user's local timezone (MST/America/Denver). Do NOT convert to UTC. The system will handle timezone conversion automatically.**
- When creating events, use the calendar_create_event tool immediately after confirming details
- **AFTER CREATING AN EVENT: If the user asks about events or wants to add another event, use calendar_get_events to see the current state of the calendar (including the event you just created)**
- When showing events, format them clearly with dates and times - show ALL events, grouped by date
- If you don't know something, use the appropriate tool to find out rather than guessing
- **Always use tools when the user asks about their calendar, schedule, or events**

Available Tools:
- calendar_list: List user's calendars - Use this first to see available calendars
- calendar_get_events: Get events in a date range - **USE THIS when user asks "what do I have today", "my events", "my schedule", etc.**
  * For "today", use start_date={today}T00:00:00, end_date={today}T23:59:59
  * For "tomorrow", use start_date={tomorrow}T00:00:00, end_date={tomorrow}T23:59:59
- calendar_create_event: Create a new event - Use this when user wants to schedule something
  * Use dates in {current_year}, format: YYYY-MM-DDTHH:MM:SS
- calendar_delete_event: Delete an event - Use this when user wants to cancel something
- When deleting, you MUST first call calendar_get_events, find the matching event, then call calendar_delete_event with that event's ID.
- item_create: Create Keysha items (action | reminder | event). Use when user says "remind me to...", "create a task...", "add an event". If required times are missing, ask a clarifying question before calling.
- item_create: Create Keysha items (action | reminder | event). Use when user says "remind me to...", "create a task...", "add an event". If required times are missing, ask a clarifying question before calling.

**CRITICAL: When user asks about their events, schedule, or calendar, you MUST call calendar_get_events tool. Do not respond without checking their actual calendar.**

Always use the user's email ({self.user_email}) when calling tools that require user_id."""
    
    def _create_agent_chain(self):
        """Create the agent execution chain"""
        # For Gemini, we'll handle tool calling directly in the chat method
        # This is a placeholder - actual tool calling happens in chat()
        return None
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List] = None
    ) -> str:
        """
        Process a user message and return AI response
        
        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
        
        Returns:
            AI response text
        """
        try:
            # Prepare conversation history
            if conversation_history is None:
                conversation_history = []
            
            # Format history for prompt
            formatted_history = []
            for msg in conversation_history:
                if msg.get("role") == "user":
                    formatted_history.append(HumanMessage(content=msg.get("content", "")))
                elif msg.get("role") == "assistant":
                    formatted_history.append(AIMessage(content=msg.get("content", "")))
            
            # Build messages for LLM
            messages = [
                SystemMessage(content=self.system_prompt),
                *formatted_history,
                HumanMessage(content=message)
            ]
            
            # For Gemini 2.5 Flash, use bind_tools to enable tool calling
            llm_with_tools = None
            try:
                # Check if bind_tools is available
                if hasattr(self.llm, 'bind_tools'):
                    logger.info(f"Binding {len(self.tools)} tools to LLM")
                    logger.info(f"Tool names: {[t.name for t in self.tools]}")
                    llm_with_tools = self.llm.bind_tools(self.tools)
                    response = await llm_with_tools.ainvoke(messages)
                else:
                    # Fallback: call without tools
                    logger.warning("bind_tools not available, calling LLM without tools")
                    response = await self.llm.ainvoke(messages)
                    llm_with_tools = self.llm  # Use regular LLM for final response
                
                # Log response for debugging
                logger.info(f"Response type: {type(response)}")
                logger.info(f"Response content type: {type(getattr(response, 'content', None))}")
                if hasattr(response, 'content'):
                    content = getattr(response, 'content', None)
                    if isinstance(content, list) and len(content) > 0:
                        logger.info(f"First content item: {content[0]}")
                logger.info(f"Response tool_calls: {getattr(response, 'tool_calls', None)}")
                logger.info(f"Response has tool_calls attr: {hasattr(response, 'tool_calls')}")
                
            except Exception as e:
                logger.error(f"Error invoking LLM: {e}", exc_info=True)
                # Fallback to regular LLM
                response = await self.llm.ainvoke(messages)
                llm_with_tools = self.llm
            
            # Check if response has tool calls
            # Gemini returns tool calls in response.tool_calls (list of tool call objects)
            tool_calls = getattr(response, "tool_calls", None) or []
            
            # Also check response.additional_kwargs for tool calls (some versions use this)
            if not tool_calls:
                additional_kwargs = getattr(response, "additional_kwargs", {})
                tool_calls = additional_kwargs.get("tool_calls", [])
            
            logger.info(f"Found {len(tool_calls)} tool calls")
            
            if tool_calls:
                # Execute tools and get results (one result per tool call)
                # _execute_tools returns a string with format: "tool_name: result\n"
                tool_results = await self._execute_tools(tool_calls)
                logger.info(f"Tool execution results (full):\n{tool_results}")
                
                # Create ToolMessage objects for each tool result (LangChain format)
                # One ToolMessage per tool call
                from langchain_core.messages import ToolMessage
                tool_messages = []
                
                # Get list of all tool names to identify when we hit a new tool
                all_tool_names = []
                for tool_call in tool_calls:
                    if isinstance(tool_call, dict):
                        all_tool_names.append(tool_call.get("name", ""))
                    else:
                        all_tool_names.append(getattr(tool_call, "name", ""))
                
                # Parse tool results - format is "tool_name: result_text\n" or "tool_name:\nresult_text"
                # The result may span multiple lines after the tool name
                result_lines = tool_results.split("\n")
                logger.debug(f"Parsed {len(result_lines)} result lines (including empty)")
                
                # Match each tool call with its result
                for i, tool_call in enumerate(tool_calls):
                    # Get tool call ID
                    if isinstance(tool_call, dict):
                        tool_call_id = tool_call.get("id", f"call_{i}")
                        tool_name = tool_call.get("name", "")
                    else:
                        tool_call_id = getattr(tool_call, "id", f"call_{i}")
                        tool_name = getattr(tool_call, "name", "")
                    
                    # Find the result for this tool using a simpler approach
                    # Look for the pattern "tool_name:" and collect everything after it until next tool or end
                    tool_result_lines = []
                    found_tool = False
                    tool_name_pattern = f"{tool_name}:"
                    
                    for line in result_lines:
                        line_stripped = line.strip()
                        
                        # Check if this line starts with our tool name
                        if line_stripped.startswith(tool_name_pattern):
                            found_tool = True
                            # Get everything after "tool_name:"
                            after_colon = line[len(tool_name_pattern):].strip()
                            if after_colon:
                                tool_result_lines.append(after_colon)
                            # Continue to collect subsequent lines
                            continue
                        
                        # If we found our tool, check if this is a new tool (stop collecting)
                        if found_tool:
                            # Check if this line starts a different tool
                            for other_tool in all_tool_names:
                                if other_tool != tool_name and line_stripped.startswith(f"{other_tool}:"):
                                    # Hit a different tool - stop collecting
                                    break
                            else:
                                # Not a different tool, so add this line to results
                                tool_result_lines.append(line)
                                continue
                            
                            # If we hit the break above, we found a different tool
                            break
                    
                    # Join all result lines
                    tool_result = "\n".join(tool_result_lines).strip()
                    
                    # If no result found, use a default message
                    if not tool_result:
                        tool_result = "No result returned"
                        logger.warning(f"No result found for tool {tool_name}. Raw tool_results (first 500 chars):\n{tool_results[:500]}")
                    else:
                        logger.info(f"Tool {tool_name} result (first 300 chars):\n{tool_result[:300]}...")
                    
                    tool_messages.append(
                        ToolMessage(
                            content=tool_result,
                            tool_call_id=tool_call_id
                        )
                    )
                
                # Add tool results to message history and get final response
                # Include the original response (with tool calls) and tool results
                final_messages = messages + [response] + tool_messages
                logger.info(f"Sending {len(final_messages)} messages to LLM for final response")
                logger.debug(f"Tool messages content: {[msg.content[:100] for msg in tool_messages]}")
                
                # Check if any tool returned an error
                has_error = any("Error" in msg.content or "error" in msg.content.lower() for msg in tool_messages)
                if has_error:
                    logger.warning("One or more tools returned an error - LLM should handle this gracefully")
                
                if llm_with_tools:
                    final_response = await llm_with_tools.ainvoke(final_messages)
                else:
                    final_response = await self.llm.ainvoke(final_messages)
                
                # Extract clean text content from response
                content = self._extract_text_content(final_response)
                logger.info(f"Final response content: {content[:200]}...")  # Log first 200 chars
                
                # If content is empty or just whitespace, provide a helpful fallback
                if not content or not content.strip():
                    # Check tool messages for errors to provide context
                    error_messages = [msg.content for msg in tool_messages if "Error" in msg.content or "error" in msg.content.lower()]
                    if error_messages:
                        return f"I encountered an error: {error_messages[0]}. Please try again or check your authentication."
                    return "I'm sorry, I didn't receive a proper response. Please try rephrasing your request."
                
                # IMPORTANT: The tool results are in tool_messages, which are part of final_messages
                # These will be included in the conversation history if the frontend sends them back
                return content
            else:
                # No tools called, return direct response
                content = self._extract_text_content(response)
                return content
                
        except Exception as e:
            logger.error(f"Error in agent chat: {e}", exc_info=True)
            # Return a more helpful error message
            error_msg = str(e)
            if "finish_reason" in error_msg or "index" in error_msg:
                return "I'm having trouble processing that request. This might be a tool calling issue. Please try rephrasing your question or try again in a moment."
            return f"I encountered an error: {error_msg}. Please try again."
    
    def _extract_text_content(self, response) -> str:
        """
        Extract clean text content from LangChain response
        
        Handles different response formats and removes metadata like signatures/extras
        """
        try:
            # Get content attribute
            content = getattr(response, "content", None)
            
            if content is None:
                return str(response)
            
            # If content is a list (LangChain message format with blocks)
            if isinstance(content, list):
                # Extract text from each content block, ignoring metadata
                text_parts = []
                for item in content:
                    if isinstance(item, dict):
                        # Check for 'text' key (ignore 'extras', 'signature', etc.)
                        if 'text' in item:
                            text_parts.append(item['text'])
                        elif 'type' in item and item.get('type') == 'text':
                            text_parts.append(item.get('text', ''))
                    elif isinstance(item, str):
                        text_parts.append(item)
                
                # If we extracted text, return it
                if text_parts:
                    return '\n'.join(text_parts)
                # If list is empty, return helpful message
                if len(content) == 0:
                    logger.warning("Response content is an empty list")
                    return "I'm sorry, I didn't receive a proper response. Please try again."
                # If list has items but no text was extracted, return string representation
                return str(content)
            
            # If content is a string, return it directly (or helpful message if empty)
            if isinstance(content, str):
                return content if content.strip() else "I'm sorry, I didn't receive a proper response. Please try again."
            
            # Fallback: convert to string
            result = str(content)
            return result if result.strip() else "I'm sorry, I didn't receive a proper response. Please try again."
            
        except Exception as e:
            logger.error(f"Error extracting text content: {e}")
            return f"I encountered an error processing the response: {str(e)}. Please try again."
    
    async def _execute_tools(self, tool_calls: List) -> str:
        """Execute tool calls and return results"""
        results = []
        
        for tool_call in tool_calls:
            try:
                # Handle different tool call formats
                if isinstance(tool_call, dict):
                    tool_name = tool_call.get("name", "") or tool_call.get("function", {}).get("name", "")
                    tool_args = tool_call.get("args", {}) or tool_call.get("function", {}).get("arguments", {})
                else:
                    # LangChain tool call object
                    tool_name = getattr(tool_call, "name", "") or getattr(tool_call, "function", {}).get("name", "")
                    tool_args = getattr(tool_call, "args", {}) or getattr(tool_call, "function", {}).get("arguments", {})
                
                # Parse JSON string if needed
                if isinstance(tool_args, str):
                    import json
                    tool_args = json.loads(tool_args)
                
                # Add user_email to tool args if needed
                if "user_email" not in tool_args:
                    tool_args["user_email"] = self.user_email
                
                # Find and execute the tool
                tool_result = None
                for tool in self.tools:
                    if tool.name == tool_name:
                        tool_result = await tool._arun(**tool_args)
                        break
                
                if tool_result:
                    results.append(f"{tool_name}: {tool_result}")
                else:
                    results.append(f"{tool_name}: Tool not found")
                    
            except Exception as e:
                logger.error(f"Error executing tool {tool_call}: {e}", exc_info=True)
                results.append(f"Tool {tool_name} execution error: {str(e)}")
        
        return "\n".join(results)
