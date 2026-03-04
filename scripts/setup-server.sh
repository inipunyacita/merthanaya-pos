#!/bin/bash

# ============================================
# Merthanaya POS - VPS Setup Script
# ============================================
# Run this script once on a fresh VPS (Ubuntu 22.04+)
# Usage: curl -sSL <raw-github-url> | sudo bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🖥️  Merthanaya POS - VPS Setup Script${NC}"
echo "============================================"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo bash setup-server.sh${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essential packages
echo -e "${YELLOW}📥 Installing essential packages...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
        echo -e "${GREEN}Added $SUDO_USER to docker group${NC}"
    fi
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose plugin
echo -e "${YELLOW}🐙 Installing Docker Compose...${NC}"
apt install -y docker-compose-plugin

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall (UFW)...${NC}"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured: SSH, HTTP, HTTPS allowed${NC}"

# Start Docker service
echo -e "${YELLOW}🚀 Starting Docker service...${NC}"
systemctl enable docker
systemctl start docker

# Create app directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p /opt/merthanaya
chown $SUDO_USER:$SUDO_USER /opt/merthanaya 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ VPS Setup Complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Clone your repository:"
echo "   cd /opt/merthanaya"
echo "   git clone https://github.com/your-username/merthanaya.git ."
echo ""
echo "2. Create environment files:"
echo "   cp .env.production.example backend/.env"
echo "   cp .env.production.example frontend/.env.production"
echo "   # Edit these files with your actual values"
echo ""
echo "3. Update nginx/nginx.conf with your domain"
echo ""
echo "4. Run the deployment:"
echo "   chmod +x scripts/*.sh"
echo "   ./scripts/deploy.sh --build"
echo ""
echo "5. (Optional) Setup SSL:"
echo "   ./scripts/setup-ssl.sh your-domain.com your@email.com"
echo ""
echo -e "${YELLOW}Note: Log out and back in for docker group changes to take effect${NC}"
