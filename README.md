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
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Prism is a comprehensive social media management platform that leverages artificial intelligence to help brands create, schedule, and publish content across multiple social platforms. Built with modern web technologies, Prism provides a unified interface for managing your entire social media presence.

### Key Capabilities

- **AI-Powered Content Creation** - Generate engaging posts using GPT-4, Claude, and DALL-E 3
- **Multi-Platform Publishing** - Manage 7+ social platforms from one dashboard
- **Smart Scheduling** - AI-suggested optimal posting times
- **Visual Design Editor** - Professional design tool with templates
- **Trend Research** - Discover and leverage trending topics
- **Analytics & Insights** - Track performance across all platforms

## ✨ Features

### 🤖 AI-Powered Content Creation

- **Smart Content Generation**: Generate engaging social media posts using advanced AI models (OpenAI GPT-4, Anthropic Claude)
- **Image Generation**: Create stunning visuals with DALL-E 3 integration
- **Content Brainstorming**: AI-powered idea generation for your brand
- **Content Improvement**: Enhance existing content with AI suggestions
- **Brand Voice Consistency**: AI learns your brand's tone and style
- **Platform-Specific Optimization**: Automatically optimize content for each platform's requirements

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

### 📅 Advanced Scheduling & Automation

- **Smart Scheduling**: AI suggests optimal posting times based on audience engagement
- **Recurring Posts**: Set up recurring content campaigns
- **Queue Management**: Visual queue system for content planning
- **Batch Upload**: Upload and schedule multiple posts at once
- **Autolist**: Automatic posting loops with content rotation
- **Background Processing**: Reliable job queue system with retry logic

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

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 20+** | Runtime environment |
| **Express 5** | Web framework |
| **Supabase** | PostgreSQL database |
| **Firebase Auth** | Authentication |
| **Firebase Storage** | File storage |
| **Redis** | Caching & sessions |
| **Bull** | Job queue system |
| **Winston** | Logging |
| **Helmet** | Security headers |

### AI Services

- **OpenAI**: GPT-4 for text generation, DALL-E 3 for images
- **Anthropic**: Claude for text generation
- **Google Gemini**: Alternative AI provider

### Infrastructure

- **DigitalOcean**: Backend hosting
- **Vercel**: Frontend hosting
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
- Social media API keys

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

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
   
   # Social Media APIs (see Configuration section)
   # ... add your platform credentials
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

   # Terminal 3: Workers
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
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: Model to use (default: `gpt-4o-mini`)
- `OPENAI_IMAGE_MODEL`: Image model (default: `dall-e-3`)
- `ANTHROPIC_API_KEY`: Anthropic API key
- `ANTHROPIC_MODEL`: Model to use (default: `claude-3-5-sonnet-20241022`)

#### CreativeEditor SDK (CE.SDK)
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

#### CE.SDK
- `CESDK_LICENSE_KEY`: CreativeEditor SDK license key

#### Security
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_SECRET`: Secret for session management

### Social Media Platform Setup

Each platform requires specific OAuth configurations. You'll need to:

1. Create an app in the platform's developer console
2. Configure OAuth redirect URLs
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

## 💻 Development

### Project Structure

```
prism/
├── src/                    # Frontend source
│   ├── api/               # API client
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── utils/              # Helper functions
├── backend/               # Backend source
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── workers/       # Background workers
│   ├── migrations/        # Database migrations
│   └── tests/             # Test files
└── public/                # Static assets
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
```

### Code Style

- ESLint for JavaScript/TypeScript linting
- Prettier for code formatting (if configured)
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Linting

```bash
npm run lint
```

### Deployment Tests

```bash
cd backend
npm run test:digitalocean
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

## 📈 Monitoring & Maintenance

### Health Checks

- Application health: `GET /health`
- API health: `GET /api/health`

### Logs

- Application logs: Winston logger
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

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Check the API documentation above
- Review the codebase structure
- Open an issue on GitHub

## 🙏 Acknowledgments

- Built with modern open-source technologies
- Inspired by the need for better social media management tools
- Special thanks to the open-source community

---

<div align="center">

**Prism** - Making social media management smarter, one post at a time.

Made with ❤️ by the Prism team

</div>
