# Strategy Backtester — Project Progress

> A full-stack algorithmic trading strategy backtester built with Next.js, FastAPI, PostgreSQL, Redis, and Celery. Fully free stack. Containerised with Docker Compose. Deployed on Vercel (frontend) and Fly.io (backend).

---

## Project Overview

| Item | Detail |
|---|---|
| Project name | Strategy Backtester |
| Goal | Let users define trading strategies, run them against historical stock data, and visualise performance metrics |
| Data source | `yfinance` (Yahoo Finance Python library — free, no API key) |
| AI/LLM | Gemini 1.5 Flash free tier (used in Phase 6 for parameter summaries) |
| Total estimated timeline | 25 days |
| Deployment cost | £0/month |

---

## Full Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| Next.js 15 + TypeScript | App framework |
| Tailwind CSS | Styling |
| Shadcn/UI | Component library |
| Recharts + D3.js | Charts (built from scratch, not embeds) |
| Monaco Editor | In-browser code editor for strategy DSL |
| React Hook Form + Zod | Form handling and validation |
| NextAuth.js | Authentication (credentials + JWT sessions) |
| Zustand | Client state management |

### Backend
| Tool | Purpose |
|---|---|
| FastAPI (Python 3.12) | REST API — all business logic |
| SQLAlchemy (async) + asyncpg | ORM and async PostgreSQL driver |
| Celery + Redis | Async job queue for backtest compute |
| Alembic | Database migrations |
| yfinance + Pandas + NumPy | Stock data fetching and compute |
| passlib[bcrypt] | Password hashing |
| python-jose | JWT token generation and verification |
| Pydantic v2 | Settings and schema validation |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local dev and production containerisation |
| PostgreSQL 16 | Primary database |
| Redis 7 | Job queue broker + result backend + cache |
| Nginx | Reverse proxy (Phase 7) |
| GitHub Actions | CI/CD pipeline |
| Vercel hobby | Frontend deployment (free) |
| Fly.io free tier | Backend containers deployment (free) |
| Resend free tier | Email notifications (3,000/month free) |

---

## Phases Overview

| Phase | Name | Days | Status |
|---|---|---|---|
| 1 | Foundation | Days 1–3 | ✅ Complete |
| 2 | Data layer | Days 4–6 | ⏳ Not started |
| 3 | Strategy builder | Days 7–10 | ⏳ Not started |
| 4 | Backtest engine | Days 11–14 | ⏳ Not started |
| 5 | Visualisations | Days 15–18 | ⏳ Not started |
| 6 | Advanced features | Days 19–22 | ⏳ Not started |
| 7 | Containerisation and deployment | Days 23–25 | ⏳ Not started |

---

## Phase 1: Foundation (Days 1–3)

### Goals

Set up the full project skeleton so that every subsequent phase adds features into an already-working system. By the end of Phase 1, a user can sign up, sign in, see an empty dashboard, and sign out. All 5 Docker containers run with a single command. Nothing crashes.

---

### Docker Compose — 5 Services

```yaml
# docker-compose.yml (summary)
services:

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXTAUTH_URL=http://localhost:3000
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on: [api]
    networks: [backtester_net]

  api:
    build: ./backend
    ports: ["8000:8000"]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/backtester
      - REDIS_URL=redis://redis:6379/0
    depends_on: [db, redis]
    networks: [backtester_net]

  worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/backtester
      - REDIS_URL=redis://redis:6379/0
    depends_on: [db, redis]
    networks: [backtester_net]

  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=backtester
    volumes: [postgres_data:/var/lib/postgresql/data]
    networks: [backtester_net]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    networks: [backtester_net]

networks:
  backtester_net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

**Key networking rule:** All containers communicate by service name, not `localhost`. FastAPI's `DATABASE_URL` uses `@db:5432`, not `@localhost:5432`. Only the `frontend` port (3000) is exposed to the browser — everything else is internal.

The `worker` container runs the same Docker image as `api` but with a different startup command. One codebase, two roles.

---

### Folder Structure

```
strategy-backtester/
├── frontend/                          # Next.js 15 app
│   ├── app/
│   │   ├── (auth)/                    # Route group — no sidebar layout
│   │   │   ├── sign-in/page.tsx       # Sign in form → NextAuth credentials
│   │   │   └── sign-up/page.tsx       # Registration form → FastAPI /users/register
│   │   ├── (dashboard)/               # Route group — shared sidebar + header layout
│   │   │   ├── layout.tsx             # Sidebar, header, session guard
│   │   │   ├── page.tsx               # Dashboard home — metric placeholders
│   │   │   ├── strategies/page.tsx    # Strategy list (empty in Phase 1)
│   │   │   └── profile/page.tsx       # User name and email from session
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/
│   │   │       └── route.ts           # NextAuth catch-all handler
│   │   ├── layout.tsx                 # Root: fonts, SessionProvider, Toaster
│   │   └── globals.css                # Tailwind base + Shadcn CSS vars
│   ├── components/
│   │   ├── ui/                        # Shadcn auto-generated — do not edit
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Nav links + sign out button
│   │   │   └── header.tsx             # Page title + user avatar
│   │   └── auth/
│   │       ├── sign-in-form.tsx       # react-hook-form, calls signIn()
│   │       └── sign-up-form.tsx       # Calls FastAPI then auto signs in
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth config: CredentialsProvider + JWT
│   │   ├── db.ts                      # pg client — used only by NextAuth adapter
│   │   └── api-client.ts             # Typed fetch wrapper for FastAPI calls
│   ├── middleware.ts                  # Redirect unauthenticated users to /sign-in
│   ├── .env.local                     # NEXTAUTH_SECRET, DATABASE_URL, API_URL
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile                     # Multi-stage: build → production
│
├── backend/                           # FastAPI + Celery
│   ├── app/
│   │   ├── main.py                    # FastAPI instance, CORS, router includes
│   │   ├── config.py                  # Pydantic BaseSettings reads from .env
│   │   ├── database.py                # Async SQLAlchemy engine + get_db()
│   │   ├── models/
│   │   │   ├── user.py                # User ORM model
│   │   │   ├── strategy.py            # Strategy model with JSONB config
│   │   │   └── backtest.py            # Backtest + Trade models
│   │   ├── routers/
│   │   │   ├── health.py              # GET /health — checks db + redis
│   │   │   └── users.py               # POST /register, POST /login, GET /me
│   │   ├── schemas/
│   │   │   ├── user.py                # UserCreate, UserResponse, Token
│   │   │   └── common.py              # APIResponse[T] generic envelope
│   │   └── workers/
│   │       └── celery_app.py          # Celery instance — scaffold only in Phase 1
│   ├── alembic/                       # Database migrations
│   │   └── versions/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── docker-compose.yml                 # 5 services, shared bridge network
├── docker-compose.dev.yml             # Volume mounts for hot reload
├── .gitignore
└── README.md
```

---

### Database Schema

#### Table: `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key, default gen_random_uuid() |
| `email` | VARCHAR(255) | Unique, not null |
| `name` | VARCHAR(255) | Not null |
| `hashed_password` | TEXT | Not null |
| `created_at` | TIMESTAMP | Default now() |
| `updated_at` | TIMESTAMP | Default now(), auto-update |

#### Table: `strategies`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → users.id, on delete cascade |
| `name` | VARCHAR(255) | Not null |
| `description` | TEXT | Nullable |
| `config` | JSONB | Not null — stores all indicator settings |
| `created_at` | TIMESTAMP | Default now() |
| `updated_at` | TIMESTAMP | Default now() |

> The `config` column is JSONB intentionally. Example value: `{"type": "sma_crossover", "fast_window": 20, "slow_window": 50, "position_size": 0.10, "stop_loss": 0.05}`. Using JSONB means adding new strategy types in Phase 3 requires no schema migration.

#### Table: `backtests`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `strategy_id` | UUID | Foreign key → strategies.id |
| `user_id` | UUID | Foreign key → users.id |
| `ticker` | VARCHAR(20) | Not null (e.g. "AAPL") |
| `start_date` | DATE | Not null |
| `end_date` | DATE | Not null |
| `status` | ENUM | pending / running / done / failed |
| `results` | JSONB | Nullable — populated when status = done |
| `created_at` | TIMESTAMP | Default now() |
| `completed_at` | TIMESTAMP | Nullable |

> The `results` column stores the full equity curve array, all performance metrics, and the trade log as JSON. This makes retrieval a single query with no joins.

#### Table: `trades`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `backtest_id` | UUID | Foreign key → backtests.id, on delete cascade |
| `symbol` | VARCHAR(20) | Not null |
| `entry_date` | TIMESTAMP | Not null |
| `exit_date` | TIMESTAMP | Nullable (open position) |
| `entry_price` | FLOAT | Not null |
| `exit_price` | FLOAT | Nullable |
| `quantity` | INTEGER | Not null |
| `direction` | VARCHAR(5) | "long" or "short" |
| `pnl` | FLOAT | Nullable — calculated on exit |
| `pnl_pct` | FLOAT | Nullable — percentage return |

#### Relationships

```
USERS ──< STRATEGIES   (one user, many strategies)
USERS ──< BACKTESTS    (one user, many backtests)
STRATEGIES ──< BACKTESTS  (one strategy, many backtests with different tickers/dates)
BACKTESTS ──< TRADES   (one backtest, many trade records)
```

---

### Authentication Flow

NextAuth.js handles sessions on the Next.js side. FastAPI handles user storage and password verification.

```
1. User submits sign-up form
   └─> POST /users/register (FastAPI)
       └─> bcrypt.hash(password)
       └─> INSERT INTO users (...)
       └─> Return {id, email, name}

2. Next.js auto-calls signIn("credentials", {email, password})
   └─> NextAuth CredentialsProvider calls POST /users/login (FastAPI)
       └─> SELECT user WHERE email = ?
       └─> bcrypt.verify(password, hashed_password)
       └─> Return {id, email, name} if match
   └─> NextAuth creates JWT session cookie

3. Every subsequent request
   └─> middleware.ts checks for __Secure-next-auth.session-token cookie
       └─> If missing and route is not /sign-in or /sign-up → redirect /sign-in
       └─> If present → allow through

4. Sign out
   └─> signOut() from next-auth/react
   └─> NextAuth deletes session cookie
   └─> middleware redirects to /sign-in
```

**Important:** The `lib/db.ts` PostgreSQL connection is only used by the NextAuth session adapter to store sessions in the `next_auth_sessions` table. It is not used for any application data — all application data reads and writes go through FastAPI.

---

### Environment Variables

#### `frontend/.env.local`

```env
# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# PostgreSQL — used ONLY by NextAuth session adapter
DATABASE_URL=postgresql://postgres:password@localhost:5432/backtester

# FastAPI base URL — NEXT_PUBLIC prefix makes this available in the browser
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### `backend/.env`

```env
# Database — note: service name 'db' used inside Docker, 'localhost' for local dev
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/backtester

# Redis — service name 'redis' used inside Docker
REDIS_URL=redis://redis:6379/0

# JWT signing secret — must match between api and worker containers
SECRET_KEY=change-this-to-a-random-64-char-string

# Token settings
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ALGORITHM=HS256
```

> Neither file is committed to Git. Add `.env` and `.env.local` to `.gitignore`. Commit `.env.example` files with placeholder values instead.

---

### Key FastAPI Endpoints (Phase 1)

| Method | Path | What it does |
|---|---|---|
| `GET` | `/health` | Returns `{status: "ok", db: "ok", redis: "ok"}` — used by Docker health checks |
| `POST` | `/users/register` | Validates input, hashes password, inserts user row, returns `UserResponse` |
| `POST` | `/users/login` | Verifies email + password, returns JWT access token |
| `GET` | `/users/me` | Reads Bearer token from header, returns current user data |

All responses use the generic envelope:

```json
{
  "success": true,
  "data": { "id": "uuid", "email": "user@example.com", "name": "John" },
  "error": null
}
```

---

### Dashboard Shell UI

What you see at the end of Phase 1 — a fully navigable interface with empty data states:

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar         │  Dashboard                            │
│                  │                                       │
│  [icon] Dashboard│  Welcome back, John                  │
│  [icon] Strategies│                                     │
│  [icon] Profile  │  ┌──────────┐  ┌──────────┐         │
│                  │  │Strategies│  │ Backtests │         │
│  ─────────────── │  │    0     │  │    0      │         │
│  John Doe        │  └──────────┘  └──────────┘         │
│  [Sign out]      │                                       │
│                  │  No strategies yet.                   │
│                  │  [Create your first strategy →]       │
└─────────────────────────────────────────────────────────┘
```

The "Create your first strategy" link leads to the strategies page, which in Phase 1 is also empty. The layout, navigation, and auth are real — only the data is absent.

---

### Build Sequence — Step by Step

Work through these in order. Each step produces a verifiable result before moving to the next.

#### Step 1: Repository and Docker skeleton

- [x] Create `frontend/` and `backend/` folders
- [x] Write `docker-compose.yml` with all 5 services
- [x] Write `docker-compose.dev.yml` with volume mounts for hot reload
- [x] Write `backend/Dockerfile` (python:3.12-slim base, uvicorn entry)
- [x] Write `frontend/Dockerfile` (node:20-alpine, two-stage build)
- [x] Write `.gitignore` (excludes `.env`, `.env.local`, `node_modules/`, `__pycache__/`, `.next/`)
- [x] **Verify:** `docker compose up --build` — all 5 containers start without errors
- [ ] Create GitHub repo: `strategy-backtester` and push (pending — see Step 7)

#### Step 2: FastAPI scaffold

- [x] Create `backend/requirements.txt` with all dependencies
- [x] Create `backend/app/main.py` — FastAPI instance with CORSMiddleware
- [x] Create `backend/app/config.py` — Pydantic BaseSettings
- [x] Create `backend/app/database.py` — async engine, SessionLocal, get_db()
- [x] Create `backend/app/routers/health.py` — `GET /health` pings db and redis
- [x] Create `backend/app/workers/celery_app.py` — Celery scaffold only
- [x] Hand-wrote `alembic.ini` and `alembic/env.py` (async-engine aware) instead of `alembic init`
- [x] **Verify:** `curl http://localhost:8000/health` returns `{"status":"ok","db":"ok","redis":"ok"}`

#### Step 3: Database models and user endpoints

- [x] Create `backend/app/models/user.py`
- [x] Create `backend/app/models/strategy.py`
- [x] Create `backend/app/models/backtest.py`
- [x] Create `backend/app/schemas/user.py` (UserCreate, UserResponse, Token)
- [x] Create `backend/app/schemas/common.py` (APIResponse generic envelope)
- [x] Create `backend/app/routers/users.py` — register, login, me endpoints
- [x] Write and run initial Alembic migration to create all 4 tables
- [x] **Verify:** `POST /users/register` creates a row in PostgreSQL; `POST /users/login` returns a JWT

#### Step 4: Next.js scaffold

- [x] `npx create-next-app@latest frontend` — scaffolded as **Next.js 16** (latest at build time; see Decisions Log)
- [x] Install Shadcn/UI: `npx shadcn@latest init`
- [x] Install dependencies: `next-auth@5 (beta)`, `react-hook-form`, `zod`, `@hookform/resolvers` (no `pg`/`@auth/pg-adapter` — see Decisions Log)
- [x] Add Shadcn components: `button`, `input`, `card`, `label`, `sonner`, `avatar`
- [x] Create `frontend/auth.ts` — NextAuth v5 CredentialsProvider calling FastAPI (root-level file per Auth.js v5 convention, not `lib/auth.ts`)
- [x] Create `frontend/lib/api-client.ts` — typed fetch wrapper, environment-aware (see Decisions Log)
- [x] Create `frontend/app/api/auth/[...nextauth]/route.ts`
- [x] **Verify:** NextAuth pages load at `/sign-in` and `/sign-up` without 404

#### Step 5: Auth UI components

- [x] Create `frontend/components/auth/sign-up-form.tsx`
- [x] Create `frontend/components/auth/sign-in-form.tsx`
- [x] Create `frontend/app/(auth)/sign-in/page.tsx`
- [x] Create `frontend/app/(auth)/sign-up/page.tsx`
- [x] **Verify:** Sign up creates user in DB; sign in sets the session cookie; browser shows authenticated (verified via curl against the running containers — register → login → session cookie → dashboard render)

#### Step 6: Dashboard shell and middleware

- [x] Create `frontend/components/layout/sidebar.tsx`
- [x] Create `frontend/components/layout/header.tsx`
- [x] Create `frontend/app/(dashboard)/layout.tsx`
- [x] Create `frontend/app/(dashboard)/page.tsx` (dashboard home with metric placeholders)
- [x] Create `frontend/app/(dashboard)/strategies/page.tsx` (empty state)
- [x] Create `frontend/app/(dashboard)/profile/page.tsx`
- [x] Create `frontend/proxy.ts` (route protection — **not** `middleware.ts`; see Decisions Log)
- [x] **Verify:** Visiting `localhost:3000` while logged out redirects to `/sign-in`. Logging in shows the dashboard.

#### Step 7: GitHub and CI

- [ ] Push all code to GitHub main branch — **pending user decision** on repo name/visibility
- [x] Create `.github/workflows/ci.yml` — runs on PR: ESLint, tsc, build, docker build
- [x] Create `README.md` with setup instructions and architecture overview
- [ ] **Verify:** Open a test PR and confirm GitHub Actions passes all checks (blocked until repo exists)

---

### Phase 1 Milestone

> At the end of Phase 1 you can:
> - Run `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` and have all 5 services running
> - Open `localhost:3000`, register a new account, and land on the dashboard
> - Navigate between Dashboard, Strategies, and Profile pages via the sidebar
> - Sign out and be redirected to the sign-in page
> - Sign back in and pick up exactly where you left off
> - Hit `localhost:8000/health` and see all services healthy
> - Check PostgreSQL and see the `users`, `strategies`, `backtests`, and `trades` tables exist (empty)

---

## Phase 2: Data Layer (Days 4–6)

> Status: ⏳ Not started — will be documented once Phase 1 is complete.

---

## Phase 3: Strategy Builder (Days 7–10)

> Status: ⏳ Not started.

---

## Phase 4: Backtest Engine (Days 11–14)

> Status: ⏳ Not started.

---

## Phase 5: Visualisations (Days 15–18)

> Status: ⏳ Not started.

---

## Phase 6: Advanced Features (Days 19–22)

> Status: ⏳ Not started.

---

## Phase 7: Containerisation and Deployment (Days 23–25)

> Status: ⏳ Not started.

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Phase 1 | Used JSONB for `strategies.config` instead of typed columns | New indicator types can be added without schema migrations |
| Phase 1 | Used JSONB for `backtests.results` instead of a separate metrics table | Single query retrieves full results; no joins needed on the results page |
| Phase 1 | Worker container uses same image as API, different command | One Dockerfile to maintain; roles separated by Docker Compose |
| Phase 1 | NextAuth CredentialsProvider backed by FastAPI, not Next.js directly | All auth logic lives in Python; Next.js only manages the session cookie |
| Phase 1 | Only `frontend` port (3000) exposed to host | Security best practice; all other services communicate on the internal Docker network |
| All phases | yfinance over Alpha Vantage or Polygon.io | Completely free, unlimited, no API key required, 25+ years of history |
| All phases | Gemini free tier over OpenAI | Generous free limits (15 req/min, 1M tokens/day); no credit card needed |
| Phase 1 | `create-next-app` installed **Next.js 16**, not 15 as originally planned | It was the current latest version at scaffold time; the bundled docs flagged breaking changes vs. training data, most notably `middleware.ts` → `proxy.ts` |
| Phase 1 | Route protection lives in `proxy.ts`, not `middleware.ts` | Next.js 16 renamed the convention; functionality is identical, only the filename and doc references changed |
| Phase 1 | NextAuth v5 (`next-auth@beta`) with JWT sessions only, no `pg` adapter or `lib/db.ts` | The Credentials provider requires JWT strategy in Auth.js; a database-session adapter would need a `next_auth_sessions` table that was never in the schema anyway. Removes an unused `pg` dependency from the frontend entirely |
| Phase 1 | Shadcn/UI initialized with the `base-nova` style, which uses `@base-ui/react` instead of Radix + `class-variance-authority` slots | Current shadcn default at scaffold time. `Button` has no `asChild` prop (base-ui uses a `render` prop instead, and explicitly recommends styling `<a>` tags directly rather than composing them into `Button`) |
| Phase 1 | `lib/api-client.ts` picks `API_INTERNAL_URL` (`http://api:8000`) when running server-side, `NEXT_PUBLIC_API_URL` (`http://localhost:8000`) in the browser | Server-side code (NextAuth `authorize`, Server Actions) executes inside the `frontend` container, where `localhost` resolves to itself, not the `api` service — the same networking rule as everything else, just easy to miss because `NEXT_PUBLIC_API_URL` looks server-safe |

---

## Commands Reference

```bash
# Start all containers with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Start in background
docker compose up -d

# Stop all containers
docker compose down

# Stop and remove volumes (wipes database)
docker compose down -v

# View logs for a specific service
docker compose logs -f api
docker compose logs -f worker

# Run database migrations
docker compose exec api alembic upgrade head

# Create a new migration after changing models
docker compose exec api alembic revision --autogenerate -m "add strategies table"

# Open a PostgreSQL shell
docker compose exec db psql -U postgres -d backtester

# Open a Redis shell
docker compose exec redis redis-cli

# Run Next.js locally without Docker (for faster frontend iteration)
cd frontend && npm run dev

# Run FastAPI locally without Docker
cd backend && uvicorn app.main:app --reload --port 8000
```
