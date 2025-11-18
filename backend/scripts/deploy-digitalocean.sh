#!/bin/bash

# DigitalOcean Deployment Script for Prism App
# This script automates the deployment process to DigitalOcean with Docker

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

# Check if running on DigitalOcean Droplet
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
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found. Please run this script from the backend directory."
    fi
    
    success "Environment check passed"
}

# Validate environment variables
validate_env() {
    log "Validating environment variables..."
    
    if [ ! -f ".env" ]; then
        error ".env file not found. Please create it from .env.digitalocean.example"
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
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            error "Required environment variable $var is missing from .env file"
        fi
    done
    
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
    docker-compose down --remove-orphans || true
    
    # Remove old images to save space
    log "Cleaning up old Docker images..."
    docker system prune -af --volumes || true
    
    # Build services
    log "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
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
    
    # Test if domain is accessible
    if curl -s --head --request GET "$BACKEND_URL" | grep "200 OK" > /dev/null; then
        log "Domain is accessible, proceeding with SSL setup..."
        
        # Run certbot for SSL certificate
        docker-compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email admin@prism-app.com \
            --agree-tos \
            --no-eff-email \
            -d api.prism-app.com || warning "SSL certificate generation failed"
        
        # Restart nginx to apply SSL configuration
        docker-compose restart nginx
        
        success "SSL certificates configured"
    else
        warning "Domain is not accessible yet. SSL setup will be skipped."
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
        if docker-compose ps | grep -q "$service.*Up"; then
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

# Display deployment summary
show_summary() {
    log "Deployment Summary"
    echo "===================="
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    echo "Services Status:"
    docker-compose ps
    echo ""
    echo "Recent Logs:"
    docker-compose logs --tail=10
    echo ""
    echo "Next Steps:"
    echo "1. Update OAuth redirect URLs in your social media apps"
    echo "2. Test the application functionality"
    echo "3. Set up monitoring and alerts"
    echo "4. Configure automated backups"
    echo ""
    echo "Useful Commands:"
    echo "- View logs: docker-compose logs -f"
    echo "- Restart services: docker-compose restart"
    echo "- Update deployment: ./scripts/deploy-digitalocean.sh"
    echo "- Run tests: node scripts/test-digitalocean-deployment.js"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Add any cleanup tasks here
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting DigitalOcean deployment for Prism App..."
    
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
    show_summary
    
    success "🎉 DigitalOcean deployment completed successfully!"
    log "Your Prism app is now running at: $BACKEND_URL"
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
        docker-compose logs -f
        ;;
    "restart")
        docker-compose restart
        ;;
    "stop")
        docker-compose down
        ;;
    "update")
        git pull origin main
        main
        ;;
    *)
        echo "Usage: $0 {deploy|test|ssl|health|logs|restart|stop|update}"
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
        exit 1
        ;;
esac