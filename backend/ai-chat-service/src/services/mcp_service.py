"""
MCP Service

Manages the MCP Google Workspace server process and handles communication.
The MCP server runs as a subprocess and communicates via stdin/stdout using JSON-RPC.
"""
import json
import subprocess
import asyncio
import logging
import os
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class MCPService:
    """
    MCP Server Process Manager
    
    Spawns and manages the Node.js MCP server subprocess.
    Handles JSON-RPC communication over stdin/stdout.
    """
    
    def __init__(
        self,
        server_path: str,
        gauth_file: str,
        accounts_file: str,
        credentials_dir: Optional[str] = None
    ):
        self.server_path = Path(server_path).resolve()
        self.gauth_file = Path(gauth_file).resolve()
        self.accounts_file = Path(accounts_file).resolve()
        self.credentials_dir = Path(credentials_dir) if credentials_dir else self.server_path
        
        self.process: Optional[subprocess.Popen] = None
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.request_id = 0
        self.pending_requests: Dict[int, asyncio.Future] = {}
        self._read_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the MCP server subprocess"""
        # Check if process is running (asyncio subprocess uses returncode instead of poll)
        if self.process and self.process.returncode is None:
            logger.info("MCP server already running")
            return
        
        try:
            # Check if server path exists
            if not self.server_path.exists():
                raise FileNotFoundError(f"MCP server path not found: {self.server_path}")
            
            # Check if required files exist
            if not self.gauth_file.exists():
                logger.warning(f"GAuth file not found: {self.gauth_file}")
            if not self.accounts_file.exists():
                logger.warning(f"Accounts file not found: {self.accounts_file}")
            
            # Build command to start MCP server
            # Priority: Use built dist in production, ts-node only in development
            server_dist = self.server_path / "dist" / "server.js"
            server_src = self.server_path / "src" / "server.ts"
            
            # Check NODE_ENV to determine mode
            is_production = os.getenv("NODE_ENV") == "production"
            
            if server_dist.exists() or is_production:
                # Production mode: use built dist (faster, no TypeScript compilation)
                if not server_dist.exists():
                    raise FileNotFoundError(f"MCP server not built. Run 'npm run build' in {self.server_path}")
                cmd = ["node", str(server_dist)]
                logger.info("Using built MCP server (production mode)")
            elif server_src.exists():
                # Development mode: use ts-node
                cmd = [
                    "node",
                    "--loader", "ts-node/esm",
                    str(server_src)
                ]
                logger.info("Using ts-node MCP server (development mode)")
            else:
                raise FileNotFoundError(f"MCP server not found. Expected either {server_dist} or {server_src}")
            
            # Add optional arguments
            cmd.extend([
                "--gauth-file", str(self.gauth_file),
                "--accounts-file", str(self.accounts_file),
                "--credentials-dir", str(self.credentials_dir)
            ])
            
            logger.info(f"Starting MCP server: {' '.join(cmd)}")
            
            # Spawn subprocess with stdin/stdout pipes
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.server_path)
            )
            
            # Get streams directly from process
            if not self.process.stdin or not self.process.stdout:
                raise RuntimeError("Failed to create subprocess pipes")
            
            # Use process pipes directly (they're already StreamReader/Writer)
            self.reader = self.process.stdout
            self.writer = self.process.stdin
            
            # Start reading responses
            self._read_task = asyncio.create_task(self._read_responses())
            
            # Wait longer for server to initialize (especially in production with cold starts)
            # ts-node can take 10-15 seconds, built dist should be faster
            wait_time = 5.0 if os.getenv("NODE_ENV") == "production" else 2.0
            logger.info(f"Waiting {wait_time}s for MCP server to initialize...")
            await asyncio.sleep(wait_time)
            
            # Initialize MCP connection (with retry)
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await self._initialize()
                    logger.info("✅ MCP server started and initialized")
                    break
                except TimeoutError as e:
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 5.0  # Exponential backoff: 5s, 10s, 15s
                        logger.warning(f"MCP initialization attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"MCP initialization failed after {max_retries} attempts: {e}")
                        raise
            
        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
            raise
    
    async def _initialize(self):
        """Initialize MCP connection (send initialize request)"""
        try:
            # MCP initialization request
            init_request = {
                "jsonrpc": "2.0",
                "id": self._get_next_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "keysha-ai-chat-service",
                        "version": "1.0.0"
                    }
                }
            }
            
            response = await self._send_request(init_request)
            logger.debug(f"MCP initialization response: {response}")
            
            # Send initialized notification
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }
            await self._send_notification(initialized_notification)
            
        except Exception as e:
            logger.error(f"MCP initialization failed: {e}")
            raise
    
    async def _read_responses(self):
        """Read responses from MCP server stdout"""
        try:
            buffer = b""
            while True:
                if not self.reader:
                    break
                
                # Read chunk (readline is better for line-delimited JSON)
                try:
                    line_bytes = await self.reader.readline()
                    if not line_bytes:
                        break
                    
                    line = line_bytes.decode('utf-8', errors='ignore').strip()
                    if not line:
                        continue
                    
                    try:
                        message = json.loads(line)
                        await self._handle_response(message)
                    except json.JSONDecodeError as e:
                        # Log to stderr for debugging (MCP server logs to stderr)
                        logger.debug(f"Failed to parse MCP message: {e}")
                        logger.debug(f"Raw line: {line[:200]}")
                    except Exception as e:
                        logger.error(f"Error handling MCP response: {e}")
                        
                except Exception as e:
                    if "Broken pipe" in str(e) or "Connection lost" in str(e):
                        logger.info("MCP server disconnected")
                        break
                    raise
                    
        except asyncio.CancelledError:
            logger.info("MCP response reader cancelled")
        except Exception as e:
            logger.error(f"Error reading MCP responses: {e}")
    
    async def _handle_response(self, message: Dict):
        """Handle incoming MCP response"""
        if "id" in message:
            # This is a response to a request
            request_id = message["id"]
            if request_id in self.pending_requests:
                future = self.pending_requests.pop(request_id)
                if not future.done():
                    if "error" in message:
                        future.set_exception(Exception(message["error"].get("message", "Unknown error")))
                    else:
                        future.set_result(message.get("result"))
        else:
            # This is a notification (no response expected)
            logger.debug(f"MCP notification: {message.get('method')}")
    
    async def _send_request(self, request: Dict) -> Dict:
        """Send JSON-RPC request and wait for response"""
        if not self.writer:
            raise RuntimeError("MCP server not started")
        
        request_id = request["id"]
        future = asyncio.Future()
        self.pending_requests[request_id] = future
        
        try:
            # Send request (newline-delimited JSON)
            message = json.dumps(request) + "\n"
            self.writer.write(message.encode('utf-8'))
            await self.writer.drain()
            
            # Wait for response (with timeout) - increased for Cloud Run cold starts
            response = await asyncio.wait_for(future, timeout=60.0)
            return response
        except asyncio.TimeoutError:
            self.pending_requests.pop(request_id, None)
            raise TimeoutError(f"MCP request {request_id} timed out")
        except Exception as e:
            self.pending_requests.pop(request_id, None)
            raise
    
    async def _send_notification(self, notification: Dict):
        """Send JSON-RPC notification (no response expected)"""
        if not self.writer:
            raise RuntimeError("MCP server not started")
        
        try:
            message = json.dumps(notification) + "\n"
            self.writer.write(message.encode('utf-8'))
            await self.writer.drain()
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            raise
    
    def _get_next_id(self) -> int:
        """Get next request ID"""
        self.request_id += 1
        return self.request_id
    
    async def list_tools(self) -> List[Dict]:
        """List available MCP tools"""
        try:
            request = {
                "jsonrpc": "2.0",
                "id": self._get_next_id(),
                "method": "tools/list"
            }
            
            response = await self._send_request(request)
            return response.get("tools", [])
            
        except Exception as e:
            logger.error(f"Failed to list MCP tools: {e}")
            return []
    
    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict:
        """
        Call an MCP tool
        
        Args:
            name: Tool name (e.g., "calendar_get_events")
            arguments: Tool arguments (must include user_id for most tools)
        
        Returns:
            Tool result
        """
        try:
            request = {
                "jsonrpc": "2.0",
                "id": self._get_next_id(),
                "method": "tools/call",
                "params": {
                    "name": name,
                    "arguments": arguments
                }
            }
            
            logger.debug(f"Sending MCP tool call request: {request}")
            response = await self._send_request(request)
            logger.debug(f"Received MCP tool call response: {response}")
            
            # Check for error in response (JSON-RPC error format)
            if "error" in response:
                error_msg = response["error"].get("message", "Unknown error")
                logger.error(f"MCP tool call error: {error_msg}")
                return {"error": error_msg}
            
            # Check for isError flag (MCP server error format)
            if response.get("isError", False):
                # Extract error from content
                if "content" in response:
                    content_items = response["content"]
                    if content_items and len(content_items) > 0:
                        first_item = content_items[0]
                        if first_item.get("type") == "text":
                            try:
                                error_data = json.loads(first_item["text"])
                                error_msg = error_data.get("error", "Tool execution failed")
                                logger.error(f"MCP tool execution error: {error_msg}")
                                return {"error": error_msg}
                            except json.JSONDecodeError:
                                logger.error(f"MCP tool error (non-JSON): {first_item['text']}")
                                return {"error": first_item["text"]}
                return {"error": "Tool execution failed"}
            
            # Extract content from response
            # MCP can return content at top level or nested under "result"
            content_items = None
            if "content" in response:
                content_items = response["content"]
            elif "result" in response and "content" in response["result"]:
                content_items = response["result"]["content"]
            
            if content_items and len(content_items) > 0:
                # Get first text content
                first_item = content_items[0]
                if first_item.get("type") == "text":
                    try:
                        # Try to parse as JSON
                        parsed = json.loads(first_item["text"])
                        logger.debug(f"Parsed JSON response: {parsed}")
                        return parsed
                    except json.JSONDecodeError:
                        # Return as text if not JSON
                        logger.debug(f"Response is plain text: {first_item['text']}")
                        return {"text": first_item["text"]}
            
            # Fallback: return the response as-is
            logger.warning(f"Unexpected response format: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to call MCP tool {name}: {e}", exc_info=True)
            raise
    
    async def stop(self):
        """Stop the MCP server"""
        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass
        
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception as e:
                logger.debug(f"Error closing writer: {e}")
        
        if self.process:
            try:
                self.process.terminate()
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.process.kill()
                await self.process.wait()
            except Exception as e:
                logger.debug(f"Error stopping process: {e}")
            
            logger.info("MCP server stopped")
