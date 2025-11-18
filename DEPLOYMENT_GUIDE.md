# Prism App Production Deployment Guide

This guide provides step-by-step instructions for deploying Prism App to production environments.

## Overview

Prism App is deployed using a multi-platform approach:
- **Frontend**: Deployed to Vercel (serverless)
- **Backend**: Deployed to Fly.io (containerized)
- **Database**: Supabase (PostgreSQL)
- **Job Queue**: Redis (via Upstash on Fly.io)
- **File Storage**: Supabase Storage

## Prerequisites

### Required Accounts
1. **Vercel Account**: For frontend deployment
2. **Fly.io Account**: For backend deployment
3. **Supabase Account**: For database and storage
4. **GitHub Account**: For version control and CI/CD

### Required Tools
- Node.js 18+ and npm
- Git
- Fly CLI (`curl -L https://fly.io/install.sh | sh`)
- Vercel CLI (`npm install -g vercel`)

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/prism-app.git
cd prism-app
```

### 2. Environment Configuration
Copy the example environment file and configure your variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
BACKEND_URL=https://your-backend.fly.dev

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Job Queue)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
SESSION_SECRET=your-secure-random-secret-min-32-chars
JWT_SECRET=your-secure-random-secret-min-32-chars

# Social Media APIs (Add your keys)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
# ... other social media platforms
```

### 3. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

## Database Setup

### 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Note down your project URL and anon key
3. Go to Settings > API to find your service role key

### 2. Run Database Migrations
```bash
cd backend
npm run migrate
cd ..
```

### 3. Configure Row Level Security (RLS)
The migrations automatically enable RLS on all tables. Ensure your Supabase project has RLS enabled.

## Backend Deployment (Fly.io)

### 1. Initialize Fly.io App
```bash
cd backend
fly launch --name prism-backend --region iad --dockerfile Dockerfile
```

### 2. Configure Environment Variables
Set your environment variables in Fly.io:
```bash
fly secrets set \
  SUPABASE_URL="your-supabase-url" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  SESSION_SECRET="your-session-secret" \
  JWT_SECRET="your-jwt-secret" \
  REDIS_HOST="your-redis-host" \
  REDIS_PASSWORD="your-redis-password"
```

### 3. Deploy Backend
```bash
fly deploy
```

### 4. Set Up Redis (Upstash)
```bash
fly redis create --name prism-redis --region iad --maxmemory 256
fly redis connect --name prism-redis
```

### 5. Scale Backend
```bash
fly scale count 2  # Run 2 instances
fly scale vm shared-cpu-1x --memory 512  # 512MB RAM per instance
```

## Frontend Deployment (Vercel)

### 1. Link to Vercel
```bash
vercel link
```

### 2. Configure Environment Variables
Add these to your Vercel project settings:
```bash
VITE_API_URL=https://your-backend.fly.dev
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy Frontend
```bash
vercel --prod
```

## Automated Deployment

### Using the Deploy Script
The project includes a comprehensive deployment script:

```bash
# Full deployment (frontend + backend)
./deploy.sh

# Deploy specific components
./deploy.sh frontend  # Frontend only
./deploy.sh backend   # Backend only
./deploy.sh migrate    # Database migrations only
./deploy.sh health     # Health checks only
```

### CI/CD Integration
Add this to your GitHub Actions workflow:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Deploy to Production
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        run: |
          chmod +x deploy.sh
          ./deploy.sh
```

## Post-Deployment Verification

### 1. Health Checks
Check that your services are running:
```bash
# Backend health
curl https://your-backend.fly.dev/health

# Frontend accessibility
open https://your-frontend.vercel.app
```

### 2. Database Connection
Verify database connectivity:
```bash
# Test Supabase connection
psql $SUPABASE_URL
```

### 3. Background Workers
Check that workers are processing jobs:
```bash
# View worker logs
fly logs --app prism-backend
```

### 4. Rate Limiting
Test rate limiting is working:
```bash
# Test API rate limits
curl -X GET https://your-backend.fly.dev/api/health
```

## Monitoring and Maintenance

### Logging
- **Backend logs**: `fly logs --app prism-backend`
- **Frontend logs**: Available in Vercel dashboard
- **Application logs**: Check `logs/` directory in your backend

### Metrics
- **Fly.io metrics**: Available in Fly.io dashboard
- **Vercel analytics**: Available in Vercel dashboard
- **Custom metrics**: Available at `/metrics` endpoint

### Security Monitoring
- Monitor failed authentication attempts
- Check for unusual API usage patterns
- Review security headers at `/security-headers`

### Performance Monitoring
- Monitor response times
- Track error rates
- Check database query performance

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
- Verify Supabase credentials
- Check network connectivity
- Ensure RLS policies are correct

#### 2. Redis Connection Issues
- Verify Redis credentials
- Check Redis service status
- Ensure proper connection strings

#### 3. Social Media API Failures
- Verify API keys are correct
- Check rate limits
- Ensure proper OAuth setup

#### 4. Deployment Failures
- Check environment variables
- Verify build logs
- Ensure all dependencies are installed

### Getting Help
- Check application logs
- Review deployment logs
- Monitor health check endpoints
- Check service dashboards

## Scaling

### Horizontal Scaling
```bash
# Scale backend instances
fly scale count 4  # 4 instances

# Scale frontend (automatic with Vercel)
```

### Vertical Scaling
```bash
# Increase backend resources
fly scale vm shared-cpu-2x --memory 1024
```

### Database Scaling
- Upgrade your Supabase plan
- Configure read replicas
- Optimize queries

## Security Best Practices

1. **Use strong secrets** for all environment variables
2. **Enable HTTPS** everywhere
3. **Implement proper CORS** policies
4. **Use rate limiting** to prevent abuse
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated**
7. **Use security headers** (implemented via Helmet)

## Cost Optimization

1. **Use appropriate instance sizes**
2. **Implement caching strategies**
3. **Optimize database queries**
4. **Use CDN for static assets**
5. **Monitor resource usage**

## Backup and Recovery

### Database Backups
- Supabase provides automatic backups
- Configure backup retention policies
- Test restore procedures

### Application State
- Redis data persistence
- File storage backups
- Configuration backups

---

For additional support, please refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [Supabase Documentation](https://supabase.com/docs)