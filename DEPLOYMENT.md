# Merthanaya POS - VPS Deployment Guide

This guide walks you through deploying the Merthanaya POS application to your VPS server.

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| RAM | 1 GB | 2 GB |
| CPU | 1 vCPU | 2 vCPU |
| Storage | 10 GB | 20 GB |
| Domain | Optional | Recommended |

---

## Quick Start (5 Minutes)

If you're experienced with Docker and VPS deployment, here's the quick version:

```bash
# On your VPS
sudo bash scripts/setup-server.sh
cd /opt/merthanaya
git clone https://github.com/YOUR_USERNAME/merthanaya.git .
cp .env.production.example backend/.env
cp .env.production.example frontend/.env.production
# Edit the .env files with your values
chmod +x scripts/*.sh
./scripts/deploy.sh --build
```

---

## Step-by-Step Guide

### Step 1: Prepare Your VPS

1. **SSH into your VPS**:
   ```bash
   ssh root@your-vps-ip
   ```

2. **Create a non-root user** (recommended for security):
   ```bash
   adduser deploy
   usermod -aG sudo deploy
   su - deploy
   ```

3. **Run the setup script**:
   ```bash
   # Download and run setup script
   curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-server.sh | sudo bash
   ```

   Or manually install Docker:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose-plugin git curl
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

---

### Step 2: Clone Your Repository

```bash
cd /opt/merthanaya
# Or any directory you prefer

git clone https://github.com/YOUR_USERNAME/merthanaya.git .
```

---

### Step 3: Configure Environment Variables

1. **Create backend environment file**:
   ```bash
   cp .env.production.example backend/.env
   nano backend/.env
   ```

   Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJI...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
   ```

2. **Create frontend environment file**:
   ```bash
   cp .env.production.example frontend/.env.production
   nano frontend/.env.production
   ```

   Fill in:
   ```env
   NEXT_PUBLIC_API_URL=https://your-domain.com/api
   # Or http://your-ip/api if no domain
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
   ```

---

### Step 4: Configure Nginx (Domain/SSL)

**If you have a domain:**

1. Point your domain's DNS A record to your VPS IP
2. Edit `nginx/nginx.conf`:
   ```bash
   nano nginx/nginx.conf
   ```
3. Replace `server_name _;` with `server_name your-domain.com;`

**If you don't have a domain:**
- The default configuration works with your VPS IP address
- Skip SSL setup

---

### Step 5: Deploy!

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy (first time with --build)
./scripts/deploy.sh --build
```

Expected output:
```
🚀 Merthanaya POS Deployment Script
============================================
🛑 Stopping existing containers...
🔨 Building and starting containers...
⏳ Waiting for services to be healthy...
✅ Backend is healthy
✅ Frontend is healthy
✅ Deployment complete!
```

---

### Step 6: Setup SSL (Optional but Recommended)

```bash
./scripts/setup-ssl.sh your-domain.com your@email.com
```

After obtaining the certificate:

1. Edit `nginx/nginx.conf`
2. Uncomment the HTTPS server block (lines 87-131)
3. Replace `your-domain.com` with your actual domain
4. Uncomment `return 301 https://$host$request_uri;` in HTTP block
5. Restart nginx:
   ```bash
   docker compose restart nginx
   ```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose ps` | Check container status |
| `docker compose logs -f` | View all logs |
| `docker compose logs -f backend` | View backend logs only |
| `docker compose logs -f frontend` | View frontend logs only |
| `docker compose restart` | Restart all services |
| `docker compose down` | Stop all services |
| `./scripts/deploy.sh --pull --build` | Update and redeploy |

---

## Updating Your Application

When you push new code to your repository:

```bash
cd /opt/merthanaya
./scripts/deploy.sh --pull --build
```

Or manually:
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :443
```

### Database connection issues

1. Verify Supabase credentials in `.env` files
2. Check if Supabase project is active
3. Ensure your VPS IP isn't blocked by Supabase

### SSL certificate issues

```bash
# Renew certificate manually
docker compose run --rm certbot renew

# Check certificate status
docker compose run --rm certbot certificates
```

### Out of memory

Edit `docker-compose.yml` memory limits or upgrade your VPS.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                   Your VPS                        │
│  ┌────────────────────────────────────────────┐  │
│  │          Nginx (Port 80/443)               │  │
│  │  - SSL termination                         │  │
│  │  - Routes / → Frontend                     │  │
│  │  - Routes /api → Backend                   │  │
│  └─────────────┬────────────┬─────────────────┘  │
│                │            │                     │
│         ┌──────▼──────┐ ┌───▼────────┐           │
│         │  Frontend   │ │  Backend   │           │
│         │  (Next.js)  │ │  (FastAPI) │           │
│         │  :3000      │ │  :8000     │           │
│         └─────────────┘ └──────┬─────┘           │
└────────────────────────────────┼─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Supabase Cloud        │
                    │   (PostgreSQL + Auth)   │
                    └─────────────────────────┘
```

---

## Security Checklist

- [ ] Changed default SSH port (optional)
- [ ] Disabled root SSH login
- [ ] UFW firewall enabled (80, 443, SSH only)
- [ ] SSL certificate configured
- [ ] Environment files not committed to git
- [ ] Strong Supabase keys used
