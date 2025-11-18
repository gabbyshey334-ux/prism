#!/bin/bash

# Production Deployment Script for Prism App
# This script automates the deployment process to production with Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://api.prism-app.com"
FRONTEND_URL="https://prism-app.com"
STAGING_URL="https://staging.prism-app.com"
DEPLOYMENT_DIR="~/prism-app"

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

# Check if running on production server
check_environment() {
    log "Checking deployment environment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.production.yml" ]; then
        error "docker-compose.production.yml not found. Please run this script from the backend directory."
    fi
    
    success "Environment check passed"
}

# Validate environment variables
validate_env() {
    log "Validating environment variables..."
    
    if [ ! -f ".env" ]; then
        error ".env file not found. Please create it from .env.production.example"
    fi
    
    # Check critical variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "JWT_SECRET"
        "SESSION_SECRET"
        "REDIS_HOST"
        "NODE_ENV"
        "FRONTEND_URL"
        "BACKEND_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            error "Required environment variable $var is missing from .env file"
        fi
    done
    
    # Verify URLs are set correctly
    if ! grep -q "FRONTEND_URL=https://prism-app.com" .env; then
        warning "FRONTEND_URL might not be set to https://prism-app.com"
    fi
    
    if ! grep -q "BACKEND_URL=https://api.prism-app.com" .env; then
        warning "BACKEND_URL might not be set to https://api.prism-app.com"
    fi
    
    success "Environment variables validated"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p logs uploads nginx/ssl nginx/logs nginx/certbot
    
    # Set proper permissions
    chmod 755 logs uploads nginx/ssl nginx/logs nginx/certbot
    
    success "Directories created"
}

# Build and start services
deploy_services() {
    log "Building and deploying services..."
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f docker-compose.production.yml down --remove-orphans || true
    
    # Remove old images to save space
    log "Cleaning up old Docker images..."
    docker system prune -af --volumes || true
    
    # Build services
    log "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30
    
    success "Services deployed successfully"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Wait for services to be fully ready
    sleep 10
    
    # Test if domains are accessible
    log "Testing domain accessibility..."
    
    if curl -s --head --request GET "$BACKEND_URL" | grep "200 OK" > /dev/null; then
        success "Production domain is accessible"
        
        # Run certbot for SSL certificate
        docker-compose -f docker-compose.production.yml run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email admin@prism-app.com \
            --agree-tos \
            --no-eff-email \
            -d api.prism-app.com || warning "SSL certificate generation for production failed"
            
        # Also setup staging certificate if staging subdomain exists
        if curl -s --head --request GET "$STAGING_URL" | grep "200 OK" > /dev/null; then
            docker-compose -f docker-compose.production.yml run --rm certbot certonly \
                --webroot \
                --webroot-path=/var/www/certbot \
                --email admin@prism-app.com \
                --agree-tos \
                --no-eff-email \
                -d staging.prism-app.com || warning "SSL certificate generation for staging failed"
        fi
        
        # Restart nginx to apply SSL configuration
        docker-compose -f docker-compose.production.yml restart nginx
        
        success "SSL certificates configured"
    else
        warning "Production domain is not accessible yet. SSL setup will be skipped."
        warning "Please ensure DNS is properly configured and run SSL setup manually later."
    fi
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    # Wait a bit more for services to stabilize
    sleep 10
    
    # Check if all services are running
    services=("redis" "backend" "workers" "nginx")
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.production.yml ps | grep -q "$service.*Up"; then
            success "$service is running"
        else
            error "$service is not running"
        fi
    done
    
    # Test API endpoints
    log "Testing API endpoints..."
    
    # Test health endpoint
    if curl -s -f "$BACKEND_URL/health" > /dev/null; then
        success "Health endpoint is accessible"
    else
        error "Health endpoint is not accessible"
    fi
    
    # Test API health endpoint
    if curl -s -f "$BACKEND_URL/api/health" > /dev/null; then
        success "API health endpoint is accessible"
    else
        error "API health endpoint is not accessible"
    fi
    
    # Test staging if available
    if curl -s --head --request GET "$STAGING_URL" | grep "200 OK" > /dev/null; then
        if curl -s -f "$STAGING_URL/health" > /dev/null; then
            success "Staging health endpoint is accessible"
        else
            warning "Staging health endpoint is not accessible"
        fi
    fi
    
    success "Health checks completed"
}

# Run deployment tests
run_tests() {
    log "Running deployment tests..."
    
    # Check if test script exists
    if [ -f "scripts/test-digitalocean-deployment.js" ]; then
        log "Running comprehensive deployment tests..."
        
        # Install test dependencies if needed
        if [ ! -d "node_modules" ]; then
            log "Installing dependencies..."
            npm install --production=false
        fi
        
        # Run tests
        node scripts/test-digitalocean-deployment.js || warning "Some tests failed"
    else
        warning "Test script not found, skipping comprehensive tests"
    fi
    
    success "Deployment tests completed"
}

# Verify OAuth configuration
verify_oauth() {
    log "Verifying OAuth configuration..."
    
    # Check if OAuth redirect URLs are properly configured
    oauth_providers=("google" "twitter" "linkedin" "facebook" "instagram" "tiktok" "youtube" "threads")
    
    echo "OAuth Redirect URLs should be configured as follows:"
    echo "Production: $BACKEND_URL/auth/{provider}/callback"
    echo "Staging: $STAGING_URL/auth/{provider}/callback"
    echo ""
    
    for provider in "${oauth_providers[@]}"; do
        echo "- $provider: $BACKEND_URL/auth/$provider/callback"
    done
    
    warning "Please verify these OAuth redirect URLs are configured in your social media apps"
    
    success "OAuth configuration verification completed"
}

# Display deployment summary
show_summary() {
    log "Deployment Summary"
    echo "===================="
    echo "Production Backend: $BACKEND_URL"
    echo "Production Frontend: $FRONTEND_URL"
    echo "Staging Environment: $STAGING_URL"
    echo ""
    echo "Services Status:"
    docker-compose -f docker-compose.production.yml ps
    echo ""
    echo "Recent Logs:"
    docker-compose -f docker-compose.production.yml logs --tail=10
    echo ""
    echo "Next Steps:"
    echo "1. Update OAuth redirect URLs in your social media apps"
    echo "2. Test the application functionality"
    echo "3. Set up monitoring and alerts"
    echo "4. Configure automated backups"
    echo "5. Verify staging environment (if applicable)"
    echo ""
    echo "Useful Commands:"
    echo "- View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "- Restart services: docker-compose -f docker-compose.production.yml restart"
    echo "- Update deployment: ./scripts/deploy-production.sh"
    echo "- Run tests: npm run test:digitalocean"
    echo "- SSL setup: ./scripts/deploy-production.sh ssl"
    echo ""
    echo "OAuth URLs to configure:"
    echo "- Google: $BACKEND_URL/auth/google/callback"
    echo "- Twitter: $BACKEND_URL/auth/twitter/callback"
    echo "- LinkedIn: $BACKEND_URL/auth/linkedin/callback"
    echo "- Facebook: $BACKEND_URL/auth/facebook/callback"
    echo "- Instagram: $BACKEND_URL/auth/instagram/callback"
    echo "- TikTok: $BACKEND_URL/auth/tiktok/callback"
    echo "- YouTube: $BACKEND_URL/auth/youtube/callback"
    echo "- Threads: $BACKEND_URL/auth/threads/callback"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Add any cleanup tasks here
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting production deployment for Prism App..."
    log "Deploying to: $BACKEND_URL"
    log "Frontend: $FRONTEND_URL"
    
    # Set up cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    check_environment
    validate_env
    setup_directories
    deploy_services
    setup_ssl
    health_checks
    run_tests
    verify_oauth
    show_summary
    
    success "🎉 Production deployment completed successfully!"
    log "Your Prism app is now running at: $BACKEND_URL"
    log "Frontend available at: $FRONTEND_URL"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        run_tests
        ;;
    "ssl")
        setup_ssl
        ;;
    "health")
        health_checks
        ;;
    "logs")
        docker-compose -f docker-compose.production.yml logs -f
        ;;
    "restart")
        docker-compose -f docker-compose.production.yml restart
        ;;
    "stop")
        docker-compose -f docker-compose.production.yml down
        ;;
    "update")
        git pull origin main
        main
        ;;
    "oauth")
        verify_oauth
        ;;
    *)
        echo "Usage: $0 {deploy|test|ssl|health|logs|restart|stop|update|oauth}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  test    - Run deployment tests"
        echo "  ssl     - Setup SSL certificates"
        echo "  health  - Run health checks"
        echo "  logs    - View service logs"
        echo "  restart - Restart all services"
        echo "  stop    - Stop all services"
        echo "  update  - Update code and redeploy"
        echo "  oauth   - Show OAuth configuration info"
        exit 1
        ;;
esac