# DentalBot - AI Receptionist for Dental Practices

AI-powered virtual receptionist that handles SMS and web chat for dental practices. Books appointments, answers FAQs, and escalates to human staff when needed.

## Features

- **SMS Channel**: Twilio webhook processes inbound patient texts
- **Web Chat Channel**: REST API for embedding chat on practice websites
- **Appointment Booking**: Books, reschedules, and cancels appointments with conflict detection
- **FAQ Knowledge Base**: Per-practice configurable Q&A for common patient questions
- **Smart Escalation**: Automatically hands off to human staff for emergencies or low-confidence situations
- **Multi-tenant**: Each dental practice has its own config, knowledge base, and appointment calendar

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+

### Setup

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Set DATABASE_URL, ANTHROPIC_API_KEY, and optionally Twilio credentials

# Run database migrations
npm run db:migrate

# Start the server
npm run dev
```

## API Endpoints

### Health
- `GET /api/health` - Health check with DB status

### Practices (Client Management)
- `GET /api/practices` - List all practices
- `POST /api/practices` - Create a practice
- `GET /api/practices/:id` - Get practice details
- `PATCH /api/practices/:id` - Update practice config
- `GET /api/practices/:id/knowledge-base` - List FAQ entries
- `POST /api/practices/:id/knowledge-base` - Add FAQ entry
- `DELETE /api/practices/:practiceId/knowledge-base/:kbId` - Remove FAQ entry
- `GET /api/practices/:id/appointments` - List appointments (filter by ?date=&status=)

### Web Chat
- `POST /api/chat/start` - Start a new chat session
- `POST /api/chat/message` - Send a message
- `GET /api/chat/history/:conversationId` - Get chat history

### SMS
- `POST /api/sms/webhook` - Twilio incoming SMS webhook

### Deployment

The app is containerized with Docker:

```bash
docker build -t dentalbot .
docker run -p 3000:3000 --env-file .env dentalbot
```

## Architecture

```
src/
  index.js          - Express app entry point
  ai/engine.js      - Claude-powered conversation engine with tool use
  db/pool.js        - PostgreSQL connection pool
  db/migrate.js     - Migration runner
  db/migrations/    - SQL migration files
  routes/
    health.js       - Health check
    practices.js    - Practice CRUD + knowledge base + appointments
    chat.js         - Web chat endpoints
    sms.js          - Twilio SMS webhook
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `PORT` | No | Server port (default: 3000) |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID (for SMS) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token (for SMS) |

## Scripts

```bash
npm run dev       # Start dev server with auto-reload
npm start         # Start production server
npm test          # Run tests
npm run lint      # Run ESLint
npm run db:migrate # Run database migrations
```

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: Express 5
- **Database**: PostgreSQL
- **AI**: Claude (Anthropic API) with tool use for appointment actions
- **SMS**: Twilio

---

Built by **EFF (Efficient Frontier)** — Autonomous passive income through automation.
