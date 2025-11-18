# Prism - AI-Powered Social Media Management Platform

![Prism Logo](public/prism-logo.png)

Prism is a comprehensive social media management platform that leverages AI to help brands create, schedule, and publish content across multiple social platforms. Built with modern web technologies and deployed on DigitalOcean with Docker.

## 🌟 Features

### AI-Powered Content Creation
- **Smart Content Generation**: Generate engaging social media posts using advanced AI models
- **Trending Topics Research**: Automatically discover and research trending topics in your niche
- **Content Templates**: Pre-built templates for different platforms and content types
- **Brand Voice Consistency**: AI learns your brand's tone and style for consistent messaging

### Multi-Platform Publishing
- **Supported Platforms**: Facebook, Instagram, LinkedIn, TikTok, YouTube, Threads, Bluesky
- **Unified Dashboard**: Manage all platforms from a single interface
- **Cross-Platform Scheduling**: Schedule posts across multiple platforms simultaneously
- **Platform-Specific Optimization**: Automatically optimize content for each platform's requirements

### Advanced Scheduling & Automation
- **Smart Scheduling**: AI suggests optimal posting times based on audience engagement
- **Recurring Posts**: Set up recurring content campaigns
- **Queue Management**: Visual queue system for content planning
- **Batch Upload**: Upload and schedule multiple posts at once

### Analytics & Insights
- **Performance Tracking**: Monitor engagement, reach, and conversion metrics
- **Competitor Analysis**: Track competitor content and performance
- **Audience Insights**: Understand your audience demographics and preferences
- **ROI Reporting**: Comprehensive reports on social media ROI

### Team Collaboration
- **Multi-User Access**: Invite team members with role-based permissions
- **Approval Workflows**: Content review and approval processes
- **Brand Management**: Manage multiple brands from one account
- **Content Library**: Centralized storage for all your media assets

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI + Custom Components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Rich Text**: Custom CKEditor integration

### Backend
- **Runtime**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Passport.js
- **File Storage**: Firebase Storage
- **Job Queues**: Bull with Redis
- **Background Workers**: Custom worker processes
- **API Documentation**: Auto-generated OpenAPI specs

### Infrastructure
- **Hosting**: DigitalOcean Droplets
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: NGINX with SSL/TLS
- **SSL Certificates**: Let's Encrypt with auto-renewal
- **Monitoring**: Built-in health checks and logging
- **CDN**: CloudFlare (optional)

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Redis server
- Supabase account
- Firebase project
- Social media API keys

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/prism-app.git
cd prism-app
```

2. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
```

3. **Set up environment variables**
```bash
# Copy environment templates
cp .env.example .env
cd backend && cp .env.example .env

# Edit .env files with your configuration
```

4. **Start development servers**
```bash
# Frontend (in root directory)
npm run dev

# Backend (in backend directory)
npm run dev

# Background workers (in backend directory)
npm run worker:dev
```

### Production Deployment

See our comprehensive deployment guides:
- [DigitalOcean Deployment Guide](backend/DIGITALOCEAN_DEPLOYMENT.md)
- [Production Deployment Guide](backend/DEPLOYMENT_GUIDE.md)
- [OAuth Configuration Guide](backend/OAUTH_CONFIGURATION.md)

## 🔧 Configuration

### Environment Variables

Key environment variables you'll need to configure:

```bash
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://prism-app.com
BACKEND_URL=https://api.prism-app.com

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Social Media APIs
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
# ... and more for each platform

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Social Media Platform Setup

Each platform requires specific OAuth configurations:
- Facebook/Instagram: App ID, App Secret, Webhook Secret
- LinkedIn: Client ID, Client Secret
- TikTok: Client Key, Client Secret
- YouTube: Client ID, Client Secret
- Threads: App ID, App Secret
- Bluesky: Identifier, Password

See [OAuth Configuration Guide](backend/OAUTH_CONFIGURATION.md) for detailed setup instructions.

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Deployment Tests
```bash
cd backend
npm run test:digitalocean
```

### Frontend Tests
```bash
npm run lint
```

## 📊 API Documentation

The backend API is documented with OpenAPI specifications. When running locally, visit:
- Health Check: `http://localhost:4000/health`
- API Health: `http://localhost:4000/api/health`

## 🔒 Security

- JWT-based authentication
- Rate limiting on all endpoints
- CORS properly configured
- Content Security Policy headers
- SSL/TLS encryption in production
- Environment variables for sensitive data
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale workers=3
```

### Manual Deployment
See the deployment guides for step-by-step instructions on setting up:
- DigitalOcean Droplet
- Docker containers
- NGINX reverse proxy
- SSL certificates
- Background workers
- Redis cache

## 📈 Monitoring & Maintenance

### Health Checks
- Application health: `https://api.prism-app.com/health`
- API health: `https://api.prism-app.com/api/health`
- Service dependencies: Built-in monitoring

### Logs
- Application logs: `docker-compose logs backend`
- Worker logs: `docker-compose logs workers`
- NGINX logs: `docker-compose logs nginx`

### Backups
- Database: Supabase automatic backups
- Redis: Manual dumps via `docker-compose exec redis redis-cli save`
- File uploads: Firebase Storage automatic backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the documentation in the `/docs` folder
- Review the deployment guides
- Check the troubleshooting sections
- Open an issue on GitHub

## 🙏 Acknowledgments

- Built with modern open-source technologies
- Inspired by the need for better social media management tools
- Special thanks to the open-source community

---

**Prism** - Making social media management smarter, one post at a time.