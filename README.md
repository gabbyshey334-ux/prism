# Prism

<div align="center">

![Prism Logo](public/prism-logo.png)

**AI-Powered Social Media Management Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)

*Making social media management smarter, one post at a time.*

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Prism is a comprehensive social media management platform that leverages artificial intelligence to help brands create, schedule, and publish content across multiple social platforms. Built with modern web technologies, Prism provides a unified interface for managing your entire social media presence.

### Key Capabilities

- **AI-Powered Content Creation** - Generate engaging posts using GPT-4, Google Gemini, and DALL-E 3
- **Multi-Platform Publishing** - Manage 7+ social platforms from one dashboard
- **Smart Scheduling** - AI-suggested optimal posting times with background job processing
- **Visual Design Editor** - Professional design tool with templates (CE.SDK integration)
- **Trend Research** - Discover and leverage trending topics in real-time
- **Analytics & Insights** - Track performance across all platforms
- **Image Analysis** - AI-powered image analysis with automatic fallback between providers

## ✨ Features

### 🤖 AI-Powered Content Creation

- **Smart Content Generation**: Generate engaging social media posts using advanced AI models (OpenAI GPT-4, Google Gemini)
- **Image Generation**: Create stunning visuals with DALL-E 3 integration
- **Image Analysis**: Analyze uploaded images with OpenAI Vision or Gemini Vision (automatic fallback on rate limits)
- **Content Brainstorming**: AI-powered idea generation for your brand
- **Content Improvement**: Enhance existing content with AI suggestions
- **Brand Voice Consistency**: AI learns your brand's tone and style
- **Platform-Specific Optimization**: Automatically optimize content for each platform's requirements
- **Automatic Fallback**: Seamlessly falls back to Google Gemini when OpenAI rate limits are hit

### 📱 Multi-Platform Publishing

**Supported Platforms:**
- Facebook
- Instagram
- LinkedIn
- TikTok
- YouTube
- Threads
- Bluesky

**Features:**
- Unified dashboard for all platforms
- Cross-platform scheduling
- OAuth integration with secure token management
- Platform-specific content formatting
- Batch posting capabilities
- Background job processing with retry logic

### 📅 Advanced Scheduling & Automation

- **Smart Scheduling**: AI suggests optimal posting times based on audience engagement
- **Recurring Posts**: Set up recurring content campaigns
- **Queue Management**: Visual queue system for content planning
- **Batch Upload**: Upload and schedule multiple posts at once
- **Autolist**: Automatic posting loops with content rotation
- **Background Processing**: Reliable job queue system with Bull and Redis
- **Retry Logic**: Automatic retry with exponential backoff for failed posts

### 🎨 Visual Design Editor

- **CE.SDK Integration**: Professional design editor with drag-and-drop functionality
- **Template Library**: Pre-built templates for all platforms
- **Dynamic Content Binding**: Placeholder system for automatic content insertion
- **Multiple Formats**: Support for Instagram, TikTok, YouTube, LinkedIn, Facebook, Twitter
- **Block Manipulation**: Add, edit, and arrange text, images, and shapes

### 📊 Analytics & Insights

- **Performance Tracking**: Monitor engagement, reach, and conversion metrics
- **Trend Analytics**: Track trend performance and viral potential scoring
- **Post Analytics**: Detailed analytics for each published post
- **Best Time Suggestions**: AI-powered optimal posting time recommendations
- **Platform Comparisons**: Compare performance across platforms

### 👥 Team Collaboration

- **Multi-User Access**: Invite team members with role-based permissions
- **Brand Management**: Manage multiple brands from one account
- **Content Library**: Centralized storage for all your media assets
- **Workflow States**: Track content from draft to published
- **Approval Workflows**: Content review and approval processes

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool and dev server |
| **Tailwind CSS** | Styling |
| **Radix UI** | Accessible component primitives |
| **TanStack Query** | Server state management |
| **React Router v7** | Routing |
| **React Hook Form** | Form management |
| **Zod** | Schema validation |
| **Recharts** | Data visualization |
| **Lucide React** | Icons |
| **Axios** | HTTP client |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 20+** | Runtime environment |
| **Express 5** | Web framework |
| **Supabase** | PostgreSQL database |
| **Firebase Auth** | Authentication |
| **Firebase Storage** | File storage |
| **Redis** | Caching, sessions & rate limiting |
| **Bull** | Job queue system |
| **Winston** | Logging |
| **Helmet** | Security headers |
| **Multer** | File upload handling |

### AI Services

- **OpenAI**: GPT-4 for text generation, GPT-4o for vision, DALL-E 3 for images
- **Google Gemini**: Primary alternative AI provider (defaults to `gemini-1.5-flash` for text, `gemini-1.5-pro` for vision)
- **Automatic Fallback**: System automatically falls back to Gemini when OpenAI rate limits are exceeded

### Infrastructure

- **DigitalOcean**: Backend hosting
- **Vercel**: Frontend hosting (optional)
- **Docker**: Containerization
- **NGINX**: Reverse proxy
- **Let's Encrypt**: SSL certificates

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ installed
- Docker & Docker Compose (for local development)
- Redis server running
- Supabase account
- Firebase project
- Social media API keys (optional for testing)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd prism
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

3. **Set up environment variables**

   Create `.env` in the root:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

   Create `backend/.env`:
```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173,http://localhost:3000

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# AI Services (at least one required)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
OPENAI_IMAGE_MODEL=dall-e-3

GOOGLE_API_KEY=your-google-api-key
GOOGLE_MODEL=gemini-1.5-flash

# CreativeEditor SDK (optional, for visual editor)
CESDK_LICENSE_KEY=your-cesdk-license-key

# JWT & Session Secrets
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Social Media APIs (optional, add as needed)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
# ... add other platform credentials
```

4. **Set up database**
```bash
cd backend
npm run migrate
```

5. **Start development servers**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Workers (for background jobs)
cd backend
npm run worker:dev
```

Visit `http://localhost:5173` to see the application.

## ⚙️ Configuration

### Environment Variables

#### Application
- `NODE_ENV`: `production` or `development`
- `PORT`: Backend server port (default: 4000)
- `FRONTEND_URL`: Primary frontend URL
- `FRONTEND_URLS`: Comma-separated list of allowed frontend URLs

#### Database (Supabase)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service role key (for admin operations)

#### Redis
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password (if required)

#### Firebase
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key

#### AI Services

**OpenAI:**
- `OPENAI_API_KEY`: OpenAI API key (required for OpenAI features)
- `OPENAI_MODEL`: Text model (default: `gpt-4o-mini`)
- `OPENAI_VISION_MODEL`: Vision model for image analysis (default: `gpt-4o`)
- `OPENAI_IMAGE_MODEL`: Image generation model (default: `dall-e-3`)

**Google Gemini:**
- `GOOGLE_API_KEY` or `GOOGLE_AI_API_KEY`: Google Gemini API key (required for Gemini features)
- `GOOGLE_MODEL`: Text model (default: `gemini-1.5-flash`)

**Note**: At least one AI service (OpenAI or Google Gemini) must be configured. The system automatically falls back to Gemini when OpenAI rate limits are hit.

#### CreativeEditor SDK
- `CESDK_LICENSE_KEY`: CreativeEditor SDK license key (required for visual editor functionality)

#### Social Media Platforms

Each platform requires specific OAuth credentials:

**Facebook/Instagram:**
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

**LinkedIn:**
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

**TikTok:**
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`

**YouTube:**
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`

**Threads:**
- `THREADS_APP_ID`
- `THREADS_APP_SECRET`

**Bluesky:**
- `BLUESKY_IDENTIFIER`
- `BLUESKY_PASSWORD`

#### Security
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_SECRET`: Secret for session management

### Social Media Platform Setup

Each platform requires specific OAuth configurations:

1. Create an app in the platform's developer console
2. Configure OAuth redirect URLs (e.g., `https://yourdomain.com/api/oauth/facebook/callback`)
3. Add credentials to environment variables
4. Set up webhooks (for some platforms)

Refer to each platform's developer documentation for detailed setup instructions.

## 📚 API Documentation

### Authentication

```http
POST   /api/auth/login          # User login
POST   /api/auth/register       # User registration
GET    /api/auth/me             # Get current user
POST   /api/auth/logout         # User logout
```

### OAuth

```http
POST   /api/oauth/connect                    # Initiate OAuth flow
GET    /api/oauth/:platform/callback         # OAuth callback handler
GET    /api/oauth/connections/:brandId        # Get brand connections
DELETE /api/oauth/connections/:connectionId   # Delete connection
GET    /api/oauth/platforms                  # List supported platforms
```

### Brands

```http
GET    /api/brands        # List brands
POST   /api/brands        # Create brand
GET    /api/brands/:id    # Get brand
PUT    /api/brands/:id    # Update brand
DELETE /api/brands/:id    # Delete brand
```

### Content

```http
POST   /api/content/generate-text        # Generate text content
POST   /api/content/generate-image       # Generate image
POST   /api/content/brainstorm           # Brainstorm content ideas
POST   /api/content/improve              # Improve existing content
GET    /api/content                      # List content
POST   /api/content                      # Create content
PUT    /api/content/:id                  # Update content
DELETE /api/content/:id                  # Delete content
PATCH  /api/content/:id/status           # Update content status
```

### Integrations (AI)

```http
POST   /api/integrations/llm             # Invoke LLM (OpenAI/Gemini with auto-fallback)
POST   /api/integrations/generate-image   # Generate image with DALL-E 3
```

**LLM Endpoint Features:**
- Automatic fallback from OpenAI to Google Gemini on rate limits
- Image analysis support (OpenAI Vision or Gemini Vision)
- JSON schema support for structured responses
- Retry logic with exponential backoff

### Trends

```http
POST   /api/trends/discover              # Discover trends
POST   /api/trends/discover/async         # Async trend discovery
GET    /api/trends/research/:topicId      # Research trend
POST   /api/trends/research               # Research new trend
POST   /api/trends/score                  # Score trend viral potential
GET    /api/trends                        # List trends
GET    /api/trends/:id                    # Get specific trend
POST   /api/trends/suggest-content        # Content suggestions from trends
GET    /api/trends/analytics/:trendId    # Trend analytics
GET    /api/trends/analytics              # Performance summary
```

### Posts

```http
POST   /api/posts/create                 # Create post
POST   /api/posts/schedule               # Schedule post
POST   /api/posts/publish/:postId        # Publish scheduled post
GET    /api/posts                        # List posts
GET    /api/posts/scheduled              # Get scheduled posts
GET    /api/posts/calendar                # Calendar view
GET    /api/posts/:id/status              # Get post status
PUT    /api/posts/:id                    # Update post
DELETE /api/posts/:id                    # Delete post
GET    /api/posts/analytics               # Get posting analytics
GET    /api/posts/best-times              # Get best posting times
```

### Templates

```http
GET    /api/templates                    # List templates
POST   /api/templates                    # Create template
GET    /api/templates/:id                # Get template
PUT    /api/templates/:id                 # Update template
DELETE /api/templates/:id                 # Delete template
GET    /api/templates/category/:category # Templates by category
GET    /api/templates/platform/:platform  # Templates by platform
```

### CE.SDK

```http
GET    /api/cesdk/key                    # Get CE.SDK license key
POST   /api/cesdk/create                 # Create design
POST   /api/cesdk/render                 # Render design to image
POST   /api/cesdk/apply-template         # Apply template
POST   /api/cesdk/apply-content          # Apply content to template
POST   /api/cesdk/blocks/text             # Add text block
POST   /api/cesdk/blocks/image            # Add image block
POST   /api/cesdk/blocks/shape            # Add shape block
POST   /api/cesdk/blocks/delete           # Delete block
POST   /api/cesdk/blocks/move             # Move block
POST   /api/cesdk/background             # Change background
```

### Uploads

```http
POST   /api/uploads                      # Upload file
GET    /api/uploads/:id                  # Get file info
DELETE /api/uploads/:id                  # Delete file
```

### Health Checks

```http
GET    /health          # Basic health check
GET    /api/health      # API health check with service status
```

## 🚢 Deployment

### Backend (DigitalOcean)

#### Option 1: Docker Compose

```bash
cd backend
docker-compose -f docker-compose.production.yml up -d
```

#### Option 2: DigitalOcean App Platform

1. Connect your repository to DigitalOcean
2. Configure environment variables
3. Set build command: `npm install && npm run migrate`
4. Deploy automatically on push

#### Option 3: Manual Deployment

```bash
cd backend
npm install
npm run migrate
npm start
```

### Frontend (Vercel)

1. Connect repository to Vercel
2. Configure environment variables:
   - `VITE_API_BASE_URL`: Your backend URL
3. Deploy automatically on push

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale workers=3
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Set up Redis for production
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Test all OAuth flows
- [ ] Verify AI service fallback works

## 💻 Development

### Project Structure

```
prism/
├── src/                    # Frontend source
│   ├── api/               # API client
│   ├── components/        # React components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── brands/        # Brand management
│   │   ├── templates/     # Template components
│   │   ├── trends/        # Trend components
│   │   ├── ui/            # UI primitives
│   │   └── editor/        # CE.SDK editor
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities (Firebase, Supabase)
│   └── utils/             # Helper functions
├── backend/               # Backend source
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   ├── ai/         # AI service integrations
│   │   │   └── platforms/  # Platform integrations
│   │   ├── workers/        # Background workers
│   │   └── middleware/     # Express middleware
│   ├── migrations/         # Database migrations
│   ├── scripts/            # Deployment scripts
│   └── tests/              # Test files
└── public/                 # Static assets
```

### Available Scripts

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

**Backend:**
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run worker       # Start background workers
npm run worker:dev   # Start workers in development mode
npm run migrate      # Run database migrations
npm test             # Run tests
npm run test:social  # Run social posting tests
```

### Code Style

- ESLint for JavaScript/TypeScript linting
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling
- Use async/await for asynchronous operations
- Follow RESTful API conventions

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
npm run test:social
```

### Frontend Linting

```bash
npm run lint
```

### Deployment Tests

```bash
cd backend
npm run test:digitalocean
npm run validate:production
```

## 🔒 Security

Prism implements multiple security measures:

- **Authentication**: JWT-based authentication with Firebase
- **Authorization**: Role-based access control
- **CORS**: Properly configured for allowed origins
- **Rate Limiting**: Redis-based rate limiting on all endpoints
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Supabase parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: OAuth state tokens
- **Row Level Security**: Database-level security policies
- **Environment Variables**: Sensitive data in environment variables
- **SSL/TLS**: Encryption in production

## 🔧 Troubleshooting

### Common Issues

#### 401 Unauthorized Errors

- Check Firebase authentication configuration
- Verify JWT tokens are being sent correctly
- Check session expiration settings
- Ensure CORS is properly configured

#### AI Service Rate Limits

- The system automatically falls back to Google Gemini when OpenAI rate limits are hit
- Ensure `GOOGLE_API_KEY` is configured for fallback
- Check rate limit logs in backend console
- Consider upgrading API tier if limits are consistently hit

#### Image Analysis Failures

- Verify image URLs are accessible
- Check that at least one vision-capable AI service is configured
- Ensure images are in supported formats (JPEG, PNG, GIF, WebP)
- Check backend logs for specific error messages

#### Database Connection Issues

- Verify Supabase credentials are correct
- Check network connectivity
- Ensure database migrations have been run
- Check Supabase dashboard for service status

#### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check Redis host and port configuration
- Ensure Redis password is correct if required
- Check Redis logs for errors

#### Worker Jobs Not Processing

- Ensure workers are running: `npm run worker`
- Check Redis connection (workers require Redis)
- Review worker logs for errors
- Verify job queue configuration

### Getting Help

1. Check backend logs in `backend/logs/`
2. Review browser console for frontend errors
3. Check API health endpoint: `GET /api/health`
4. Review environment variable configuration
5. Check service status (Supabase, Firebase, Redis)

## 📈 Monitoring & Maintenance

### Health Checks

- Application health: `GET /health`
- API health: `GET /api/health`

### Logs

- Application logs: Winston logger (see `backend/logs/`)
- Worker logs: Separate worker logging
- Access logs: Request/response logging

### Backups

- Database: Supabase automatic backups
- Redis: Manual dumps via `redis-cli save`
- File uploads: Firebase Storage automatic backups

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

### Contribution Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Add comments for complex logic

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Check the API documentation above
- Review the codebase structure
- Check troubleshooting section
- Open an issue on GitHub

## 🙏 Acknowledgments

- Built with modern open-source technologies
- Inspired by the need for better social media management tools
- Special thanks to the open-source community
- AI services powered by OpenAI and Google

---

<div align="center">

**Prism** - Making social media management smarter, one post at a time.

Made with ❤️ by the Prism team

</div>

