# Dealer Logic Ultra Stack

Complete Automotive Dealership Intelligence Platform - A modern, full-stack solution for automotive dealerships featuring AI-powered voice assistance, real-time analytics, and comprehensive CRM capabilities.

## Features

- **AI Voice Assistant**: Intelligent voice call handling and routing
- **Real-time Analytics**: Live dashboards and performance metrics
- **CRM Integration**: Complete customer relationship management
- **ROI Calculator**: Financial analysis and projections
- **Pricing Tiers**: Flexible subscription models
- **WebSocket Support**: Real-time updates and notifications

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.io
- JWT Authentication
- Winston Logging

### Frontend
- Next.js 15
- React 19
- TailwindCSS
- Radix UI Components
- Framer Motion
- Zustand State Management
- React Query

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis (optional, for caching)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dealer-logic-ultra-stack
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your database in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dealer_logic"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
SESSION_SECRET="your-session-secret"
FRONTEND_URL="http://localhost:3001"
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Seed the database (optional):
```bash
npm run seed
```

### Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Backend (port 3000)
npm run dev:backend

# Frontend (port 3001)
npm run dev:frontend
```

### Production Build

```bash
# Build everything
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

## ElevenLabs/ConvAI Integration

This project includes built-in integration with ElevenLabs and ConvAI for voice agent management:

### Sync Agents
```bash
# Sync all Dealer Logic agents from ConvAI
npm run sync-agents
```

### ElevenLabs API Endpoints
- `POST /api/elevenlabs/sync-agents` - Sync agents from ConvAI/ElevenLabs
- `GET /api/elevenlabs/agents` - List all synced agents
- `GET /api/elevenlabs/agents/:id` - Get agent details
- `POST /api/elevenlabs/agents/:id/deploy` - Deploy agent to ElevenLabs
- `GET /api/elevenlabs/agents/:id/conversations` - Get agent conversation history
- `GET /api/elevenlabs/agents/:id/metrics` - Get agent performance metrics
- `GET /api/elevenlabs/voices` - List available voices
- `POST /api/elevenlabs/agents/:id/test-voice` - Test agent voice

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### Dealerships
- `GET /api/dealerships` - List all dealerships
- `GET /api/dealerships/:id` - Get dealership details
- `POST /api/dealerships` - Create dealership (admin)
- `PUT /api/dealerships/:id` - Update dealership (admin)
- `DELETE /api/dealerships/:id` - Delete dealership (admin)

### Voice Calls
- `GET /api/voice/calls` - List voice calls
- `POST /api/voice/calls` - Create new call
- `PUT /api/voice/calls/:id/status` - Update call status
- `GET /api/voice/agents` - List available agents

### Analytics
- `GET /api/analytics/dashboard/:dealershipId` - Dashboard metrics
- `GET /api/analytics/reports/:dealershipId` - Generate reports

### CRM
- `GET /api/crm/customers` - List customers
- `POST /api/crm/customers` - Create customer
- `GET /api/crm/leads` - List leads
- `POST /api/crm/leads` - Create lead
- `GET /api/crm/pipeline/:dealershipId` - Sales pipeline

### Pricing & ROI
- `GET /api/pricing/tiers` - Available pricing tiers
- `GET /api/pricing/calculator` - Price calculator
- `GET /api/roi/calculate/:dealershipId` - Calculate ROI
- `GET /api/roi/projections/:dealershipId` - ROI projections

## WebSocket Events

The application uses Socket.io for real-time communication:

### Client Events
- `join_dealership` - Join dealership room
- `voice_call_status` - Update call status
- `analytics_update` - Send analytics data

### Server Events
- `call_update` - Receive call updates
- `analytics_data` - Receive analytics updates

## Project Structure

```
dealer-logic-ultra-stack/
├── src/
│   ├── backend/
│   │   ├── api/          # API route handlers
│   │   ├── config/       # Configuration files
│   │   ├── database/     # Database connection
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── server.ts     # Express server
│   ├── frontend/
│   │   ├── components/   # React components
│   │   ├── pages/        # Next.js pages
│   │   └── styles/       # CSS styles
│   ├── lib/              # Shared libraries
│   ├── shared/           # Shared types
│   └── utils/            # Utility functions
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # Static assets
└── package.json
```

## Testing

Run tests with coverage:
```bash
npm test
```

## Linting

Check code quality:
```bash
npm run lint
```

Type checking:
```bash
npm run typecheck
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email support@dealerlogic.com or join our Slack channel.