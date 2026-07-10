# Strategy Backtester

A full-stack algorithmic trading strategy backtester. Define trading strategies, run them against historical stock data, and visualise performance metrics.

## Tech stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, NextAuth.js (Auth.js v5)
- **Backend**: FastAPI, SQLAlchemy (async) + asyncpg, Celery + Redis, Alembic
- **Data**: yfinance, Pandas, NumPy
- **Infra**: Docker Compose, PostgreSQL 16, Redis 7

## Prerequisites

- Docker Desktop
- Node.js 20+ (for local frontend iteration outside Docker)
- Python 3.12+ (for local backend iteration outside Docker)

## Getting started

1. Copy the example env files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

   Generate a real `AUTH_SECRET` for `frontend/.env.local`:

   ```bash
   openssl rand -base64 32
   ```

2. Start all services with hot reload:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

3. Run the initial database migration (first time only):

   ```bash
   docker compose exec api alembic upgrade head
   ```

4. Open [http://localhost:3000](http://localhost:3000), sign up, and you'll land on the dashboard.

## Architecture

- `frontend/` — Next.js app. Auth is handled by NextAuth.js with a Credentials provider that calls the FastAPI backend; sessions are JWT-based (no separate sessions table). Route protection lives in `proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
- `backend/` — FastAPI app with async SQLAlchemy models, Alembic migrations, and a Celery worker scaffold for future async backtest jobs.
- Containers communicate over the `backtester_net` Docker network by service name (`db`, `redis`, `api`), never `localhost`. The frontend's server-side code uses `API_INTERNAL_URL=http://api:8000` for this reason, while the browser uses `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Commands

```bash
# Start all containers with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop all containers
docker compose down

# Stop and remove volumes (wipes database)
docker compose down -v

# View logs for a specific service
docker compose logs -f api

# Run database migrations
docker compose exec api alembic upgrade head

# Create a new migration after changing models
docker compose exec api alembic revision --autogenerate -m "description"

# Open a PostgreSQL shell
docker compose exec db psql -U postgres -d backtester
```

See [progress.md](progress.md) for the full build plan and phase-by-phase roadmap.
