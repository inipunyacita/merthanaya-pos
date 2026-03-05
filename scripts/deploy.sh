#!/bin/bash

# ============================================
# Merthanaya POS - Deployment Script
# ============================================
# Usage: ./scripts/deploy.sh [options]
# Options:
#   --build     Force rebuild of all containers
#   --pull      Pull latest code before deploying
#   --ssl       Setup SSL certificates (first time only)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Merthanaya POS Deployment Script${NC}"
echo "============================================"

# Parse arguments
BUILD_FLAG=""
PULL_CODE=false
SETUP_SSL=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --build) BUILD_FLAG="--build --no-cache" ;;
        --pull) PULL_CODE=true ;;
        --ssl) SETUP_SSL=true ;;
        *) echo -e "${RED}Unknown parameter: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Navigate to project root
cd "$(dirname "$0")/.."

# Pull latest code if requested
if [ "$PULL_CODE" = true ]; then
    echo -e "${YELLOW}📥 Pulling latest code from git...${NC}"
    git pull origin main
fi

# Check if environment files exist
if [ ! -f "./backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env not found!${NC}"
    echo "   Copy .env.production.example and create backend/.env"
    exit 1
fi

if [ ! -f "./frontend/.env.production" ]; then
    echo -e "${RED}❌ Error: frontend/.env.production not found!${NC}"
    echo "   Copy .env.production.example and create frontend/.env.production"
    exit 1
fi

# Load environment variables for docker-compose
export $(grep -v '^#' ./frontend/.env.production | xargs)

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker compose down --remove-orphans || true

# Build and start containers
echo -e "${YELLOW}🔨 Building and starting containers...${NC}"
if [ -n "$BUILD_FLAG" ]; then
    docker compose build --no-cache
fi
docker compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
docker compose ps

# Health check
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check backend
if curl -s http://localhost/api/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting up...${NC}"
fi

# Check frontend
if curl -s http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting up...${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "============================================"
echo "Frontend: http://localhost (or your domain)"
echo "API Docs: http://localhost/api/docs"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose ps             # Check status"
echo "  docker compose down           # Stop all"
