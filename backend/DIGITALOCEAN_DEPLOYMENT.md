# DigitalOcean Deployment Guide for Prism App

This guide walks you through deploying the Prism app on DigitalOcean using Docker containers with NGINX reverse proxy and SSL/TLS certificates.

## Prerequisites

- DigitalOcean account
- Domain name (e.g., prism-app.com)
- Basic knowledge of Linux command line

## Step 1: Create DigitalOcean Droplet

1. **Log into DigitalOcean** and create a new Droplet
2. **Choose an image**: Ubuntu 22.04 LTS
3. **Choose a plan**: Basic $12/month (1GB RAM, 1 vCPU) or higher for production
4. **Choose a datacenter region**: Pick closest to your users
5. **Authentication**: Use SSH keys (recommended) or password
6. **Choose a hostname**: `api.prism-app.com`
7. **Create Droplet**

## Step 2: Initial Server Setup

Connect to your Droplet:
```bash
ssh root@your_droplet_ip
```

### Create a new user (recommended)
```bash
adduser prism
usermod -aG sudo prism
```

### Configure firewall
```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### Switch to new user
```bash
su - prism
```

## Step 3: Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

Log out and back in for Docker group changes to take effect:
```bash
exit
ssh prism@your_droplet_ip
```

## Step 4: Set Up Project Directory

```bash
# Create project directory
mkdir ~/prism-app
cd ~/prism-app

# Clone your repository (or upload files)
git clone https://github.com/yourusername/prism-app.git .
# OR upload files using SCP:
# scp -r /path/to/your/backend/* prism@your_droplet_ip:~/prism-app/
```

## Step 5: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

Update these critical variables:
```bash
# Application
NODE_ENV=production
PORT=3000

# Database (update with your credentials)
DATABASE_URL=postgresql://username:password@localhost:5432/prism_prod

# Redis (Docker internal networking)
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters

# OAuth Redirect URLs (update for your domain)
GOOGLE_REDIRECT_URI=https://api.prism-app.com/auth/google/callback
TWITTER_REDIRECT_URI=https://api.prism-app.com/auth/twitter/callback
LINKEDIN_REDIRECT_URI=https://api.prism-app.com/auth/linkedin/callback

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Social Media API Keys (your production keys)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Step 6: Configure Domain and DNS

1. **Go to your domain registrar**
2. **Create an A record**: `api.prism-app.com` pointing to your Droplet's IP address
3. **Wait for DNS propagation** (usually 5-15 minutes)

Test DNS:
```bash
nslookup api.prism-app.com
```

## Step 7: Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 8: Set Up SSL Certificates

### Initial SSL Certificate Setup
```bash
# Create nginx directories
mkdir -p nginx/ssl nginx/logs nginx/certbot

# Run certbot for the first time
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d api.prism-app.com
```

### Update NGINX Configuration
After certificates are generated, restart NGINX:
```bash
docker-compose restart nginx
```

### Automatic Renewal
The certbot container is already configured to automatically renew certificates. It runs every 12 hours and will renew certificates when they're close to expiration.

## Step 9: Verify Deployment

### Health Check
```bash
# Test health endpoint
curl https://api.prism-app.com/health

# Expected response: {"status":"healthy","timestamp":"..."}
```

### Test API Endpoints
```bash
# Test API
curl https://api.prism-app.com/api/health

# Test with authentication (replace with your token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.prism-app.com/api/user/profile
```

### Check Logs
```bash
# Application logs
docker-compose logs backend

# Worker logs
docker-compose logs workers

# NGINX logs
docker-compose logs nginx
```

## Step 10: Update OAuth Redirect URLs

Update your OAuth applications with the new production URLs:

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Find your OAuth 2.0 Client ID
4. Update "Authorized redirect URIs" to: `https://api.prism-app.com/auth/google/callback`

### Twitter OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Navigate to your app settings
3. Update callback URLs to: `https://api.prism-app.com/auth/twitter/callback`

### LinkedIn OAuth
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Navigate to your app settings
3. Update "Authorized redirect URLs" to: `https://api.prism-app.com/auth/linkedin/callback`

## Step 11: Monitor and Maintain

### View Service Status
```bash
# Check all services
docker-compose ps

# Check resource usage
docker stats
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Data
```bash
# Backup Redis data
docker-compose exec redis redis-cli save
docker cp prism-redis:/data/dump.rdb ./backup-redis-$(date +%Y%m%d).rdb

# Backup uploads
tar -czf backup-uploads-$(date +%Y%m%d).tar.gz uploads/
```

### Monitor Logs
```bash
# Real-time logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f workers
```

## Troubleshooting

### Services Won't Start
```bash
# Check Docker status
sudo systemctl status docker

# Check logs
docker-compose logs

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### SSL Certificate Issues
```bash
# Check certificate status
docker-compose exec certbot certbot certificates

# Manually renew
docker-compose exec certbot certbot renew

# Check NGINX configuration
docker-compose exec nginx nginx -t
```

### Redis Connection Issues
```bash
# Check Redis container
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

### High Memory Usage
```bash
# Check memory usage
free -h

# Check Docker stats
docker stats

# Restart services
docker-compose restart
```

## Security Best Practices

1. **Regular Updates**: Keep your system and Docker images updated
2. **Firewall**: Only open necessary ports (80, 443, 22)
3. **SSH Keys**: Use SSH keys instead of passwords
4. **Fail2ban**: Install fail2ban to prevent brute force attacks
5. **Monitoring**: Set up monitoring alerts for downtime
6. **Backups**: Regularly backup your data and configurations

## Performance Optimization

1. **Enable Swap** (if needed):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. **Docker Optimization**:
```bash
# Clean up unused images and containers
docker system prune -a

# Limit container memory
docker-compose up -d --scale backend=1 --scale workers=2
```

## Support

For issues and questions:
- Check the logs first: `docker-compose logs`
- Verify DNS: `nslookup api.prism-app.com`
- Test health: `curl https://api.prism-app.com/health`
- Check service status: `docker-compose ps`

## Next Steps

1. Set up monitoring (Prometheus, Grafana)
2. Configure automated backups
3. Set up CI/CD pipeline
4. Implement load balancing for high availability
5. Add CDN for static assets

---

**Congratulations!** Your Prism app is now deployed on DigitalOcean with Docker, NGINX, and SSL/TLS certificates. The application is ready for production use with proper security, monitoring, and scalability features.