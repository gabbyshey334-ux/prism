#!/bin/bash

# SSL Certificate Setup Script for Prism App
# This script sets up SSL certificates using Let's Encrypt

set -e

# Configuration
DOMAIN="api.prism-app.com"
EMAIL="admin@prism-app.com"  # Change this to your email
NGINX_CONF_DIR="./nginx/conf.d"
SSL_DIR="./nginx/ssl"
CERTBOT_DIR="./nginx/certbot"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root (required for certbot)
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Create necessary directories
log_info "Creating SSL directories..."
mkdir -p $SSL_DIR
mkdir -p $CERTBOT_DIR
mkdir -p ./nginx/logs
mkdir -p ./uploads

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Start nginx in HTTP mode first (for Let's Encrypt challenge)
log_info "Starting nginx for initial SSL certificate generation..."
docker-compose up -d nginx

# Wait for nginx to start
sleep 5

# Check if nginx is running
if ! docker-compose ps nginx | grep -q "Up"; then
    log_error "Nginx failed to start. Check logs with: docker-compose logs nginx"
    exit 1
fi

# Generate SSL certificate using Let's Encrypt
log_info "Generating SSL certificate for $DOMAIN..."
docker run --rm \
    -p 80:80 \
    -v $SSL_DIR:/etc/letsencrypt \
    -v $CERTBOT_DIR:/var/lib/letsencrypt \
    -v ./nginx/logs:/var/log/letsencrypt \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Check if certificate was generated successfully
if [ ! -f "$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
    log_error "SSL certificate generation failed"
    exit 1
fi

log_info "SSL certificate generated successfully!"

# Restart nginx with HTTPS configuration
log_info "Restarting nginx with HTTPS configuration..."
docker-compose restart nginx

# Wait for nginx to restart
sleep 5

# Test HTTPS connection
log_info "Testing HTTPS connection..."
if curl -f -I https://$DOMAIN/health > /dev/null 2>&1; then
    log_info "HTTPS connection successful!"
else
    log_warning "HTTPS connection test failed. Please check nginx logs:"
    log_warning "docker-compose logs nginx"
fi

# Set up automatic renewal
log_info "Setting up automatic SSL renewal..."
cat > ./scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

docker run --rm \
    -v ./nginx/ssl:/etc/letsencrypt \
    -v ./nginx/certbot:/var/lib/letsencrypt \
    -v ./nginx/logs:/var/log/letsencrypt \
    certbot/certbot renew --quiet

# Reload nginx if renewal was successful
if [ $? -eq 0 ]; then
    docker-compose exec nginx nginx -s reload
fi
EOF

chmod +x ./scripts/renew-ssl.sh

# Add to crontab for automatic renewal
echo "Adding SSL renewal to crontab..."
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/renew-ssl.sh") | crontab -

log_info "SSL setup completed!"
log_info "Certificate will auto-renew via cron job at 2 AM daily"
log_info "Certificate location: $SSL_DIR/live/$DOMAIN/"
log_info "Renewal script: ./scripts/renew-ssl.sh"

# Display certificate information
log_info "Certificate details:"
docker run --rm -v $SSL_DIR:/etc/letsencrypt certbot/certbot certificates | grep -A 10 "$DOMAIN"

echo ""
echo "🎉 SSL Certificate Setup Complete!"
echo "Your API is now accessible at: https://$DOMAIN"
echo "Health check: https://$DOMAIN/health"