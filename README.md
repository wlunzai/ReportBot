# ReportBot

Scheduled Report & Alert Pipelines for business users. Connect your data sources, define queries, set schedules, and receive formatted reports via email or Slack.

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+

### Setup

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other config

# Run database migrations
npm run db:migrate

# Start the dev server (auto-restart on changes)
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `PORT` | API server port | 3000 |
| `SMTP_HOST` | SMTP server for email delivery | - |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SLACK_WEBHOOK_URL` | Slack webhook for alert delivery | - |

### Scripts

```bash
npm run dev       # Start dev server with auto-reload
npm start         # Start production server
npm test          # Run tests
npm run lint      # Run ESLint
npm run db:migrate # Run database migrations
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (includes DB status) |
| GET | `/api/pipelines` | List all pipelines |
| GET | `/api/pipelines/:id` | Get a single pipeline |
| POST | `/api/pipelines` | Create a pipeline |
| PATCH | `/api/pipelines/:id` | Update a pipeline |
| DELETE | `/api/pipelines/:id` | Delete a pipeline |

### Deployment

The app is containerized with Docker. Deploy to Railway, Fly.io, or any Docker-compatible host:

```bash
docker build -t reportbot .
docker run -p 3000:3000 --env-file .env reportbot
```

## Architecture

```
src/
  index.js           # Express app entry point
  routes/
    health.js        # Health check endpoint
    pipelines.js     # Pipeline CRUD API
  services/          # Business logic (scheduler, connectors, delivery)
  db/
    pool.js          # PostgreSQL connection pool
    migrate.js       # Migration runner
    migrations/      # SQL migration files
  lib/               # Shared utilities
```
