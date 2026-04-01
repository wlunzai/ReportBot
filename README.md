# ReportBot

Scheduled Report & Alert Pipelines for business users. Connect your data sources, define queries, set schedules, and receive formatted reports via email or Slack.

## Features

- **Data Sources:** PostgreSQL, Google Sheets
- **Scheduling:** Timezone-aware cron (daily, weekly, monthly, custom)
- **Delivery:** Email (SMTP with HTML + CSV attachment) and Slack (webhook)
- **Alerts:** Threshold conditions (e.g. `revenue < 1000`, `row_count == 0`)
- **Dashboard:** Web UI to create/manage pipelines and view run history
- **Manual Runs:** Trigger any pipeline on-demand via API or UI

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and SMTP settings

npm run db:migrate
npm run dev
```

Open http://localhost:3000 for the dashboard.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `PORT` | API server port | 3000 |
| `SMTP_HOST` | SMTP server for email delivery | smtp.gmail.com |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | From address for emails | SMTP_USER |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service account JSON | - |

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
| POST | `/api/pipelines/:id/run` | Trigger a manual run |
| GET | `/api/pipelines/:id/runs` | Get run history for a pipeline |
| GET | `/api/runs` | List all recent runs |
| GET | `/` | Web dashboard |

### Creating a Pipeline

```bash
curl -X POST http://localhost:3000/api/pipelines \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Daily Sales Report",
    "schedule": "0 9 * * *",
    "source_type": "postgres",
    "source_config": {
      "connection_string": "postgresql://user:pass@db:5432/sales",
      "timezone": "America/New_York"
    },
    "query_text": "SELECT * FROM daily_sales WHERE date = CURRENT_DATE",
    "delivery_type": "email",
    "delivery_config": {
      "to": "team@example.com",
      "subject_prefix": "[Sales]"
    },
    "alert_condition": "total_revenue < 1000"
  }'
```

### Deployment

```bash
docker build -t reportbot .
docker run -p 3000:3000 --env-file .env reportbot
```

## Architecture

```
src/
  index.js              # Express app entry point + scheduler bootstrap
  scheduler/
    engine.js           # Timezone-aware cron scheduling engine
  connectors/
    postgres.js         # PostgreSQL data source connector
    sheets.js           # Google Sheets data source connector
  delivery/
    email.js            # SMTP email delivery (HTML table + CSV)
    slack.js            # Slack webhook delivery
  pipeline/
    runner.js           # Pipeline orchestrator (fetch -> alert -> deliver)
    alerts.js           # Threshold alert evaluation
  routes/
    health.js           # Health check endpoint
    pipelines.js        # Pipeline CRUD + manual run API
    runs.js             # Run history API
  public/
    index.html          # Web dashboard (single-page)
  db/
    pool.js             # PostgreSQL connection pool
    migrate.js          # Migration runner
    migrations/         # SQL migration files
```
