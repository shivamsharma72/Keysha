#!/bin/bash
# Deployment script for Google Cloud Run
# Usage: ./deploy.sh [project-id] [region]

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}
SERVICE_NAME="keysha-ai-chat-service"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Keysha AI Chat Service to Google Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the Docker image (for linux/amd64 platform - Cloud Run requirement)
echo "🏗️  Building Docker image for linux/amd64..."
cd "$(dirname "$0")/.."  # Go to backend/ directory (parent of ai-chat-service)
docker build --platform linux/amd64 -t ${IMAGE_NAME}:latest -f ai-chat-service/Dockerfile .

# Push the image to Container Registry
echo "📤 Pushing image to Container Registry..."
docker push ${IMAGE_NAME}:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8000 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars "MONGODB_URI=${MONGODB_URI},GEMINI_API_KEY=${GEMINI_API_KEY},SERVICE_TOKEN=${SERVICE_TOKEN},JWT_SECRET=${JWT_SECRET},AUTH_SERVICE_URL=${AUTH_SERVICE_URL},ITEM_SERVICE_URL=${ITEM_SERVICE_URL},INTEGRATION_SERVICE_URL=${INTEGRATION_SERVICE_URL},FRONTEND_URL=${FRONTEND_URL},MCP_SERVER_PATH=/app/mcp-server,MCP_GAUTH_FILE=/app/mcp-server/.gauth.json,MCP_ACCOUNTS_FILE=/app/mcp-server/.accounts.json,NODE_ENV=production,MCP_GAUTH_JSON_B64=${MCP_GAUTH_JSON_B64},MCP_ACCOUNTS_JSON_B64=${MCP_ACCOUNTS_JSON_B64}"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)'
