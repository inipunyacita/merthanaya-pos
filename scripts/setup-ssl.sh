#!/bin/bash

# ============================================
# SSL Certificate Setup with Let's Encrypt
# ============================================
# Usage: ./scripts/setup-ssl.sh <domain> <email>
# Example: ./scripts/setup-ssl.sh example.com admin@example.com

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./scripts/setup-ssl.sh <domain> <email>"
    echo "Example: ./scripts/setup-ssl.sh example.com admin@example.com"
    exit 1
fi

cd "$(dirname "$0")/.."

echo "🔐 Setting up SSL for $DOMAIN..."

# First, make sure containers are running
docker compose up -d nginx

# Wait for nginx to start
sleep 5

# Get initial certificate
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

echo ""
echo "✅ SSL Certificate obtained!"
echo ""
echo "Now you need to:"
echo "1. Edit nginx/nginx.conf"
echo "2. Uncomment the HTTPS server block"
echo "3. Replace 'your-domain.com' with '$DOMAIN'"
echo "4. Uncomment 'return 301 https://\$host\$request_uri;' in HTTP block"
echo "5. Run: docker compose restart nginx"
