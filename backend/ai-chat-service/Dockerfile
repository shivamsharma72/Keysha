# Multi-stage Dockerfile for Keysha AI Chat Service
# Includes Python (FastAPI) + Node.js (MCP Server)
#
# Build context should be: backend/ (parent directory)
# Example: docker build -f ai-chat-service/Dockerfile -t keysha-ai .

# ============================================
# Stage 1: Build MCP Server (Node.js)
# ============================================
FROM node:20-slim AS mcp-builder

WORKDIR /build/mcp-server

# Copy MCP server files (from backend/ context)
COPY mcp-google-workspace/package*.json ./
COPY mcp-google-workspace/tsconfig.json ./
COPY mcp-google-workspace/src ./src

# Install dependencies and build TypeScript
RUN npm ci && npm run build

# ============================================
# Stage 2: Python Runtime + Node.js
# ============================================
FROM python:3.11-slim

# Install Node.js (needed for MCP server subprocess)
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install
COPY ai-chat-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python application code
COPY ai-chat-service/src ./src
COPY ai-chat-service/*.py ./

# Copy built MCP server from builder stage
COPY --from=mcp-builder /build/mcp-server/dist ./mcp-server/dist
COPY --from=mcp-builder /build/mcp-server/package*.json ./mcp-server/
COPY --from=mcp-builder /build/mcp-server/node_modules ./mcp-server/node_modules

# Copy MCP server source (needed for some runtime files)
COPY mcp-google-workspace/src ./mcp-server/src
COPY mcp-google-workspace/tsconfig.json ./mcp-server/

# Create directory for MCP server credentials (will be mounted or set via env)
RUN mkdir -p /app/mcp-server/.credentials

# Expose port
EXPOSE 8000

# Health check (using curl instead of requests to avoid extra dependency)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "src.main"]
