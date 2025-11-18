#!/bin/bash

# Prism App Production Deployment Script
# This script handles deployment to both Vercel (frontend) and Fly.io (backend)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="."
BACKEND_DIR="backend"
ENVIRONMENT=${1:-production}

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if Fly CLI is installed for backend deployment
    if ! command -v fly &> /dev/null; then
        log_warning "Fly CLI is not installed. Installing now..."
        curl -L https://fly.io/install.sh | sh
        export FLYCTL_INSTALL="$HOME/.fly"
        export PATH="$FLYCTL_INSTALL/bin:$PATH"
    fi
    
    # Check if Vercel CLI is installed for frontend deployment
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI is not installed. Installing now..."
        npm install -g vercel
    fi
    
    log_success "All dependencies are available"
}

# Validate environment variables
validate_env() {
    log_info "Validating environment variables..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please copy .env.example to .env and fill in your values."
        exit 1
    fi
    
    # Check critical environment variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SESSION_SECRET"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment variables validated"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci
    
    # Build the frontend
    log_info "Building frontend for production..."
    npm run build
    
    # Check if build was successful
    if [ ! -d "dist" ]; then
        log_error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Frontend built successfully"
    cd - > /dev/null
}

# Build backend
build_backend() {
    log_info "Building backend..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci --production
    
    # Run any build scripts if they exist
    if npm run build --silent 2>/dev/null; then
        log_info "Backend build script executed"
    else
        log_info "No build script found for backend, skipping"
    fi
    
    log_success "Backend built successfully"
    cd - > /dev/null
}

# Deploy frontend to Vercel
deploy_frontend() {
    log_info "Deploying frontend to Vercel..."
    
    cd "$FRONTEND_DIR"
    
    # Deploy to Vercel
    if vercel --prod --token="$VERCEL_TOKEN"; then
        log_success "Frontend deployed to Vercel successfully"
    else
        log_error "Frontend deployment to Vercel failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Deploy backend to Fly.io
deploy_backend() {
    log_info "Deploying backend to Fly.io..."
    
    cd "$BACKEND_DIR"
    
    # Deploy to Fly.io
    if fly deploy --app prism-backend --region iad; then
        log_success "Backend deployed to Fly.io successfully"
    else
        log_error "Backend deployment to Fly.io failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$BACKEND_DIR"
    
    # Run migrations
    if npm run migrate; then
        log_success "Database migrations completed successfully"
    else
        log_error "Database migrations failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Backend health check
    backend_url="${BACKEND_URL:-https://prism-backend.fly.dev}"
    if curl -f "$backend_url/health" > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    log_success "Health checks completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Add any cleanup tasks here
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Prism App deployment to $ENVIRONMENT environment..."
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Load environment variables
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Run deployment steps
    check_dependencies
    validate_env
    build_frontend
    build_backend
    run_migrations
    deploy_frontend
    deploy_backend
    health_check
    
    log_success "Deployment completed successfully!"
    log_info "Frontend: https://your-frontend-domain.vercel.app"
    log_info "Backend: https://prism-backend.fly.dev"
    log_info "Health Check: https://prism-backend.fly.dev/health"
}

# Handle script arguments
case "${1:-deploy}" in
    "frontend")
        check_dependencies
        validate_env
        build_frontend
        deploy_frontend
        ;;
    "backend")
        check_dependencies
        validate_env
        build_backend
        run_migrations
        deploy_backend
        health_check
        ;;
    "build")
        check_dependencies
        validate_env
        build_frontend
        build_backend
        ;;
    "migrate")
        check_dependencies
        validate_env
        run_migrations
        ;;
    "health")
        health_check
        ;;
    "deploy"|"")
        main
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Available commands:"
        log_info "  deploy    - Full deployment (default)"
        log_info "  frontend  - Deploy frontend only"
        log_info "  backend   - Deploy backend only"
        log_info "  build     - Build both frontend and backend"
        log_info "  migrate   - Run database migrations"
        log_info "  health    - Run health checks"
        exit 1
        ;;
esac