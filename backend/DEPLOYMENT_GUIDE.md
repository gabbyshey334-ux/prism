# DigitalOcean Deployment Guide

## Quick Start

### 1. Create Droplet
- **Image**: Ubuntu 22.04 LTS
- **Plan**: Basic $12/month (1GB RAM, 1 vCPU)
- **Region**: Choose closest to users
- **SSH Keys**: Use SSH keys (recommended)

### 2. Connect to Server
```bash
ssh root@your_droplet_ip
```

### 3. Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 4. Setup Project
```bash
# Create project directory
mkdir ~/prism-app && cd ~/prism-app

# Upload your backend files (or git clone)
# scp -r /local/path/to/backend/* $USER@your_droplet_ip:~/prism-app/
```

### 5. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical Variables:**
```bash
NODE_ENV=production
REDIS_HOST=redis
DATABASE_URL=postgresql://user:pass@localhost:5432/prism_prod
JWT_SECRET=your-secure-jwt-secret
GOOGLE_REDIRECT_URI=https://api.prism-app.com/auth/google/callback
TWITTER_REDIRECT_URI=https://api.prism-app.com/auth/twitter/callback
LINKEDIN_REDIRECT_URI=https://api.prism-app.com/auth/linkedin/callback
```

### 6. Setup Domain
**DNS A Record:**
```
api.prism-app.com → YOUR_DROPLET_IP
```

### 7. Deploy
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 8. SSL Setup
```bash
# Create directories
mkdir -p nginx/ssl nginx/logs nginx/certbot

# Get SSL certificate
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d api.prism-app.com

# Restart NGINX
docker-compose restart nginx
```

### 9. Verify Deployment
```bash
# Health check
curl https://api.prism-app.com/health

# API test
curl https://api.prism-app.com/api/health
```

### 10. Update OAuth URLs
Update your OAuth apps with production URLs:
- Google: `https://api.prism-app.com/auth/google/callback`
- Twitter: `https://api.prism-app.com/auth/twitter/callback`
- LinkedIn: `https://api.prism-app.com/auth/linkedin/callback`

## Commands Reference

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull && docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Backup
docker cp prism-redis:/data/dump.rdb ./backup-redis.rdb
tar -czf backup-uploads.tar.gz uploads/

# Monitor
docker stats
docker-compose ps
```

## Troubleshooting

**Services won't start:**
```bash
docker-compose logs
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

**SSL issues:**
```bash
docker-compose exec certbot certbot certificates
docker-compose exec nginx nginx -t
```

**Redis connection:**
```bash
docker-compose exec redis redis-cli ping
```

**Memory issues:**
```bash
free -h
docker system prune -a
```

## Security

- Enable firewall: `sudo ufw enable`
- Use SSH keys only
- Regular updates: `sudo apt update && sudo apt upgrade`
- Monitor logs: `docker-compose logs -f`

## Support

Check these first:
1. `docker-compose ps` - service status
2. `docker-compose logs` - error logs
3. `curl https://api.prism-app.com/health` - health check
4. DNS: `nslookup api.prism-app.com`