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
| 2 | Data layer | Days 4–6 | ✅ Complete |
| 3 | Strategy builder | Days 7–10 | ✅ Complete |
| 4 | Backtest engine | Days 11–14 | ✅ Complete |
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
│   ├── proxy.ts                       # Route protection — redirects unauthenticated users to /sign-in (Next.js 16 renamed middleware.ts to proxy.ts)
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

> The `config` column is JSONB intentionally. As of Phase 3, it stores raw Python code and a free-form params dict — no `type` enum, no hardcoded strategy fields. Example value:
> ```json
> {
>   "code": "import pandas as pd\n\ndef should_enter(row, hist, p):\n    fast = hist['adj_close'].rolling(p['fast']).mean().iloc[-1]\n    slow = hist['adj_close'].rolling(p['slow']).mean().iloc[-1]\n    return fast > slow\n\ndef should_exit(row, hist, p, pos):\n    fast = hist['adj_close'].rolling(p['fast']).mean().iloc[-1]\n    slow = hist['adj_close'].rolling(p['slow']).mean().iloc[-1]\n    return fast < slow\n\nparams = {'fast': 20, 'slow': 50}",
>   "params": { "fast": 20, "slow": 50 },
>   "position_size": 0.10,
>   "stop_loss": 0.05
> }
> ```
> Using JSONB means the user can write any Python strategy without any schema migration.

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
| `entry_price` | DECIMAL(12,4) | Not null |
| `exit_price` | DECIMAL(12,4) | Nullable |
| `quantity` | INTEGER | Not null |
| `direction` | VARCHAR(5) | "long" or "short" |
| `pnl` | DECIMAL(12,4) | Nullable — calculated on exit |
| `pnl_pct` | DECIMAL(8,4) | Nullable — percentage return |

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

### Goals

Wire in real stock data. By the end, a user can search for any ticker using a debounced autocomplete input and see a historical OHLCV price chart rendered by Recharts. No mock data — all prices come from yfinance via a Celery background task. The `tickers` table is seeded once at startup from SEC EDGAR. Redis sits between the API and PostgreSQL as a cache for both search results and price data.

---

### New Database Schema

Two new tables are added in Phase 2. Two Alembic migrations are written and run in sequence.

#### Table: `tickers`

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | Primary key |
| `symbol` | VARCHAR(10) | Unique, not null |
| `name` | VARCHAR(255) | Not null |
| `exchange` | VARCHAR(50) | Nullable |
| `cik` | VARCHAR(20) | Nullable — SEC CIK number for cross-referencing |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMP | Default now() |

> Seeded once at startup from `https://www.sec.gov/files/company_tickers.json`. Unique index on `symbol`. Upsert-on-conflict makes re-seeding safe.

#### Table: `price_history`

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `ticker_id` | INTEGER | Foreign key → tickers.id, on delete cascade |
| `date` | DATE | Not null |
| `open` | DECIMAL(12,4) | Not null |
| `high` | DECIMAL(12,4) | Not null |
| `low` | DECIMAL(12,4) | Not null |
| `close` | DECIMAL(12,4) | Not null |
| `adj_close` | DECIMAL(12,4) | Not null — used for backtest calculations |
| `volume` | BIGINT | Not null |

> Composite unique constraint on `(ticker_id, date)` prevents duplicate rows on re-fetch. BRIN index on `date` for fast range queries (backtests always query by date range). DECIMAL(12,4) avoids floating-point rounding errors on financial data.

#### Updated Relationships

```
USERS ──< STRATEGIES      (one user, many strategies)
USERS ──< BACKTESTS       (one user, many backtests)
STRATEGIES ──< BACKTESTS  (one strategy, many backtests)
BACKTESTS ──< TRADES      (one backtest, many trade records)
TICKERS ──< PRICE_HISTORY (one ticker, many daily OHLCV rows)
```

---

### Folder Structure Additions

Files added in Phase 2 only. Phase 1 files are unchanged.

```
backend/app/
├── models/
│   ├── ticker.py                  # Ticker ORM model
│   └── price_history.py           # PriceHistory ORM model
├── routers/
│   ├── tickers.py                 # GET /tickers/search, GET /tickers/{symbol}
│   └── market_data.py             # GET /market-data/{symbol}, POST fetch, GET status
├── schemas/
│   ├── ticker.py                  # TickerResponse, TickerSearchResult
│   └── market_data.py             # PriceBar, OHLCVResponse
├── services/
│   ├── ticker_service.py          # Search logic with Redis cache read/write
│   └── market_data_service.py     # Staleness check, fetch trigger, cache population
└── workers/
    └── tasks/
        ├── seed_tickers.py        # seed_tickers_from_edgar() — runs once at startup
        └── fetch_ohlcv.py         # fetch_ohlcv(symbol, start, end) — Celery async task

frontend/
├── app/(dashboard)/
│   └── market-data/
│       └── page.tsx               # Market data page — assembles search + chart
├── components/
│   └── market-data/
│       ├── ticker-search.tsx      # Debounced autocomplete with keyboard nav
│       ├── date-range-picker.tsx  # Two date inputs + quick presets (1M, 6M, YTD, 1Y, 5Y, MAX); commits on blur only
│       ├── price-chart.tsx        # Recharts ComposedChart — candlestick (default) or line, plus volume bars
│       └── candlestick-bar.tsx    # Two range-valued Bar shapes (wick + body) for OHLC candlesticks — see Decisions Log
└── lib/
    ├── hooks/
    │   └── use-ticker-search.ts   # Debounced search hook (300ms)
    └── store/
        └── market-data-store.ts   # Zustand store: selectedTicker, dateRange, chartType ('candlestick' | 'line')

alembic/versions/
├── 002_add_tickers_table.py
└── 003_add_price_history_table.py
```

---

### Key FastAPI Endpoints (Phase 2)

| Method | Path | What it does |
|---|---|---|
| `GET` | `/tickers/search?q={query}` | Returns top 10 matching tickers from Redis cache or DB |
| `GET` | `/tickers/{symbol}` | Returns full ticker detail for a single symbol |
| `GET` | `/market-data/{symbol}?start={date}&end={date}` | Returns OHLCV array; triggers background fetch if data is missing or stale |
| `POST` | `/market-data/{symbol}/fetch` | Explicitly enqueues a `fetch_ohlcv()` task; returns Celery job ID |
| `GET` | `/market-data/{symbol}/status/{job_id}` | Polls Celery task status — `pending / running / done / failed` |

All responses use the same generic envelope as Phase 1:

```json
{
  "success": true,
  "data": [
    { "date": "2024-01-02", "open": 185.32, "high": 188.44, "low": 184.97, "close": 187.15, "adj_close": 187.15, "volume": 58234100 }
  ],
  "error": null
}
```

---

### Celery Tasks

#### `seed_tickers_from_edgar()`

- **When:** Triggered once on worker container startup via Celery `worker_ready` signal (not `on_after_finalize` — see Decisions Log)
- **Source:** `https://www.sec.gov/files/company_tickers.json` — free government endpoint, no API key
- **What it returns:** A flat JSON object with ~10,000 entries: `{cik_str, ticker, title}`
- **What it does:** Upserts each row into `tickers` using `INSERT ... ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name`
- **Idempotency:** Safe to run multiple times — duplicate rows are never created
- **Verify:** `SELECT COUNT(*) FROM tickers;` should return ~10,000 after first run

#### `fetch_ohlcv(symbol: str, start_date: str, end_date: str)`

- **When:** Triggered by `/market-data/{symbol}` when data is missing or stale
- **What it does:**
  1. Calls `yf.download(symbol, start=start_date, end=end_date, auto_adjust=True)`
  2. Receives a Pandas DataFrame: columns are Open, High, Low, Close, Adj Close, Volume
  3. Looks up `ticker_id` from the `tickers` table
  4. Bulk inserts rows into `price_history` using `INSERT ... ON CONFLICT (ticker_id, date) DO UPDATE`
  5. Caches the serialised result in Redis with the appropriate TTL
  6. Marks the Celery task result as complete
- **Verify:** After calling `/market-data/AAPL?start=2023-01-01&end=2023-12-31`, check `SELECT COUNT(*) FROM price_history;` and worker logs for a yfinance download line

---

### Staleness Check Logic

Before triggering a yfinance fetch, `market_data_service.py` checks whether the data already exists and is fresh. This prevents hammering yfinance on every page load.

```python
async def get_or_fetch_price_data(symbol: str, start: date, end: date):
    cache_key = f"ohlcv:{symbol}:{start}:{end}"

    # 1. Check Redis cache — fastest path
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Check price_history table — second fastest
    rows = await db.query(PriceHistory).filter(
        PriceHistory.ticker.symbol == symbol,
        PriceHistory.date.between(start, end)
    ).order_by(PriceHistory.date).all()

    if rows and is_fresh(rows[-1].date):
        ttl = 86400 if end < date.today() else 900  # 24h for historical, 15m for recent
        await redis.set(cache_key, serialise(rows), ex=ttl)
        return rows

    # 3. Trigger background fetch — data is missing or stale
    task = fetch_ohlcv.delay(symbol, str(start), str(end))
    return {"job_id": task.id, "status": "fetching"}


def is_fresh(latest_date: date) -> bool:
    today = date.today()
    # Allow 1-day lag for weekends and market holidays
    return (today - latest_date).days <= 1
```

---

### Redis Caching Strategy

| Cache key pattern | TTL | Content |
|---|---|---|
| `tickers:search:{query}` | 1 hour | Top 10 search results for a query string |
| `ohlcv:{symbol}:{start}:{end}` | 15 minutes (recent data) | Full OHLCV array for a recent date range |
| `ohlcv:{symbol}:{start}:{end}` | 24 hours (historical data) | Full OHLCV array for a fully historical range |
| `ohlcv:{symbol}:latest` | 15 minutes | Most recent price bar for a symbol |

> The TTL split between recent and historical data is important: past prices never change (splits and dividends are already adjusted), but today's data may be updated during market hours. Any range whose `end` date is `< date.today()` gets the 24-hour TTL.

---

### Frontend Components

#### `TickerSearch` (`components/market-data/ticker-search.tsx`)

- Controlled input with 300ms debounce via `use-ticker-search.ts` hook
- On each debounced keystroke: calls `GET /tickers/search?q={value}` via `api-client.ts`
- Renders a dropdown of up to 10 results: `{SYMBOL} — {Company Name} ({exchange})`
- On selection: stores the chosen ticker in Zustand (`selectedTicker` field) and collapses the dropdown
- Keyboard navigation: ArrowUp / ArrowDown to move through results, Enter to select, Escape to close
- Empty state: "No tickers found for '{query}'"
- Loading state: spinner replaces the dropdown while the request is in flight

#### `DateRangePicker` (`components/market-data/date-range-picker.tsx`) — added post-Phase-2, not in original spec

- Two native `<input type="date">` fields (start/end) plus quick presets: 1M, 6M, YTD, 1Y, 5Y, MAX
- Holds a local `draft` value so every keystroke of the native date input (which fires `onChange` per digit — typing "2020" walks through "0002" → "0020" → "0200" → "2020") updates visually without touching the shared store
- Only commits to the Zustand `dateRange` field (which `PriceChart` fetches against) `onBlur`, and only if the value is a complete, plausible date (4-digit year ≥ 1900) — this was a real bug found live: uncommitted per-keystroke commits caused a flood of racing fetches where the last-to-resolve (not last-typed) request won, making the chart appear to "revert" to a stale range
- `MAX` preset uses `1970-01-01` as a floor; yfinance simply returns whatever real history exists from there

#### `PriceChart` (`components/market-data/price-chart.tsx`)

- Reads `selectedTicker`, `dateRange`, and `chartType` from Zustand store
- On ticker or date-range change: calls `GET /market-data/{symbol}?start={dateRange.start}&end={dateRange.end}`
- Three render states:
  - **Loading:** skeleton placeholder matching the chart dimensions
  - **Fetching (job queued):** "Fetching prices for {SYMBOL}..." with a progress indicator; polls `/market-data/{symbol}/status/{job_id}` every 2 seconds
  - **Loaded:** full Recharts `ComposedChart`
- **Chart type toggle** (top-right corner of the chart card): "Candlestick" | "Line" button group. Default is candlestick. State stored in Zustand `chartType` field so the preference persists across ticker changes.
- **Candlestick mode (default):**
  - Y-axis domain is `[floor(min(low) * 0.99, 2dp), ceil(max(high) * 1.01, 2dp)]` across the visible range — not just close prices
  - Rendered as **two range-valued `Bar` layers** (see `candlestick-bar.tsx` below), not a single `dataKey="close"` Bar with a scale-hacking shape (see Decisions Log — the originally-planned `props.yAxis.scale` approach does not work on the installed Recharts version and was replaced)
  - Green bars (`#1D9E75`) when `close >= open`; red bars (`#E24B4A`) when `close < open`
  - `Bar` for volume on a secondary Y-axis (lower opacity, always visible in both modes)
- **Line mode:**
  - `Line` for adjusted close price (primary Y-axis)
  - `Bar` for volume on secondary Y-axis
- **Common to both modes:**
  - `XAxis` with date ticks computed by `computeTicks()` — picks up to 10 evenly-spaced bars by index, always including the true first/last. Recharts' `interval`/`minTickGap` heuristics mislabel the axis start on large bar counts even though the underlying data is correct
  - Price `YAxis` uses hand-computed, rounded `ticks` for the same reason (see Decisions Log) — `$` prefix, 2 decimal places; right Y-axis abbreviated volume (e.g. `12.3M`)
  - `Tooltip` showing full OHLCV breakdown on hover
  - `ReferenceLine` at the mean adjusted close price

#### `candlestick-bar.tsx` (`components/market-data/candlestick-bar.tsx`)

Renders a proper OHLC candlestick using **two `<Bar>` elements with array-valued (range) `dataKey`s**, not a single Bar with a scale-hacking custom shape. Recharts natively supports a `dataKey` that resolves to a `[min, max]` tuple for floating/range bars — `computeBarRectangles` maps both ends through the real axis scale (`yAxis.scale.map`) itself, so no manual scale access is needed at all:

```tsx
export function toCandleData(bars: PriceBar[]): CandleDatum[] {
  return bars
    .filter((b) => Number.isFinite(b.low) && Number.isFinite(b.high) && Number.isFinite(b.open) && Number.isFinite(b.close))
    .map((bar) => ({
      ...bar,
      wickRange: [bar.low, bar.high],
      bodyRange: [Math.min(bar.open, bar.close), Math.max(bar.open, bar.close)],
    }));
}

export function WickShape({ x, y, width, height, payload }) {
  const fill = payload.close >= payload.open ? GREEN : RED;
  const midX = x + width / 2;
  return <rect x={midX - 0.5} y={y} width={1} height={Math.max(height, 1)} fill={fill} />;
}

export function BodyShape({ x, y, width, height, payload }) {
  const fill = payload.close >= payload.open ? GREEN : RED;
  return <rect x={x} y={y} width={width} height={Math.max(height, 1)} fill={fill} />;
}
```

Used in `price-chart.tsx` as:

```tsx
<Bar yAxisId="price" dataKey="wickRange" barSize={1} shape={WickShape} isAnimationActive={false} legendType="none" />
<Bar yAxisId="price" dataKey="bodyRange" shape={BodyShape} isAnimationActive={false} legendType="none" />
```

---

### Build Sequence — Step by Step

#### Day 4: Ticker Database + Seeding

- [x] Create `backend/app/models/ticker.py` — SQLAlchemy `Ticker` model
- [x] Create `backend/app/schemas/ticker.py` — `TickerResponse`, `TickerSearchResult` Pydantic schemas
- [x] Write Alembic migration: `002_add_tickers_table` — creates table + unique index on `symbol`
- [x] Run migration: `docker compose exec api alembic upgrade head`
- [x] Create `backend/app/workers/tasks/seed_tickers.py` — `seed_tickers_from_edgar()` task
- [x] Wire task to run on worker startup via `worker_ready` signal in `celery_app.py` (see Decisions Log)
- [x] Create `backend/app/services/ticker_service.py` — search with Redis cache read/write
- [x] Create `backend/app/routers/tickers.py` — `GET /tickers/search`, `GET /tickers/{symbol}`
- [x] Register tickers router in `backend/app/main.py`
- [x] **Verify:** `docker compose up` → worker logs show "Seeded N tickers from EDGAR". `curl "localhost:8000/tickers/search?q=AAPL"` returns Apple with exchange and CIK (confirmed live: 9,304 tickers seeded, search returns Apple Inc.)

#### Day 5: Price Data Pipeline

- [x] Create `backend/app/models/price_history.py` — SQLAlchemy `PriceHistory` model
- [x] Create `backend/app/schemas/market_data.py` — `PriceBar`, `OHLCVResponse` schemas
- [x] Write Alembic migration: `003_add_price_history_table` — creates table + composite unique + BRIN index on `date`
- [x] Run migration: `docker compose exec api alembic upgrade head`
- [x] Create `backend/app/workers/tasks/fetch_ohlcv.py` — `fetch_ohlcv(symbol, start, end)` task
- [x] Create `backend/app/services/market_data_service.py` — staleness check + fetch trigger + cache population
- [x] Create `backend/app/routers/market_data.py` — three endpoints (OHLCV, fetch, status)
- [x] Register market_data router in `backend/app/main.py`
- [x] **Verify:** `curl "localhost:8000/market-data/AAPL?start=2023-01-01&end=2023-12-31"` — first call returns `{job_id, status: "fetching"}`; worker logs show yfinance download; second call returns the full OHLCV array from cache (confirmed live: 1,169 rows fetched and cached for AAPL, 2022–2026)

#### Day 6: Frontend Data Layer

- [x] Create `frontend/lib/hooks/use-ticker-search.ts` — debounced search hook (300ms)
- [x] Create `frontend/components/market-data/ticker-search.tsx` — autocomplete with keyboard nav
- [x] Create `frontend/components/market-data/date-range-picker.tsx` — two date inputs + quick presets (1M, 6M, YTD, 1Y, 5Y, MAX); commits to Zustand store on blur only with 4-digit year plausibility check
- [x] Create `frontend/components/market-data/candlestick-bar.tsx` — two range-valued Bar shapes (wick + body); green/red fill based on `close >= open` (originally spec'd as a `props.yAxis.scale`-hacking single Bar shape; that never actually shipped in the initial Phase 2 pass and was corrected during Phase 3 QA — see Decisions Log)
- [x] Create `frontend/components/market-data/price-chart.tsx` — Recharts ComposedChart with candlestick as default + line toggle + volume bars; chart type stored in Zustand
- [x] Create `frontend/app/(dashboard)/market-data/page.tsx` — assembles `TickerSearch` + `DateRangePicker` + `PriceChart`
- [x] Add "Market Data" nav link to `frontend/components/layout/sidebar.tsx`
- [x] Add `selectedTicker`, `dateRange`, and `chartType` fields to Zustand store
- [x] **Verify:** Search "TSLA"/"NVDA" in the browser → dropdown appears → select ticker → candlestick chart loads with green/red candles and volume bars; toggle to line view renders adj_close line; date presets update the range correctly (confirmed live in-browser with NVDA across the full 2022–2026 range, 1133 bars, zero console errors on the final pass)

---

### Phase 2 Milestone

> At the end of Phase 2 you can:
> - Navigate to the Market Data page from the sidebar
> - Type any ticker (e.g. "NVDA") and see a dropdown of matching companies from the `tickers` table
> - Select a ticker and watch the price chart load — first call triggers the Celery task, subsequent calls return from Redis cache
> - Check PostgreSQL: `SELECT COUNT(*) FROM tickers;` → ~10,000 rows; `SELECT COUNT(*) FROM price_history;` → rows for every fetched ticker
> - Check Redis: `redis-cli KEYS "ohlcv:*"` shows cached OHLCV responses; `redis-cli KEYS "tickers:search:*"` shows cached search results
> - Confirm yfinance is only called once per ticker per date range — the second chart load is instant

---

## Phase 3: Strategy Builder (Days 7–10)

### Goals

Build the full strategy authoring experience. A user can write arbitrary Python trading logic in a Monaco Editor pane, configure run parameters, get live validation feedback, pick from six predefined code templates, and save their strategy. No code is executed in Phase 3 — execution is Phase 4's job. Phase 3 is purely about authoring and persistence.

The target user is a developer, not a pure trader. The Monaco editor is the primary interface. Predefined templates load as editable code, not locked black boxes. The `params` dict gives the user full control over what variables their strategy receives.

---

### Strategy Config — Revised Schema

The `strategies.config` JSONB column stores the full strategy definition:

```json
{
  "code": "import pandas as pd\n\ndef should_enter(row, hist, p):\n    ...",
  "params": { "fast": 20, "slow": 50 },
  "position_size": 0.10,
  "stop_loss": 0.05
}
```

There are no `"type"` enums or hardcoded strategy fields. Every strategy is raw Python. The `params` dict is whatever the user defines — it is passed directly as the `p` argument to `should_enter()` and `should_exit()` at backtest time.

---

### Sandbox API Contract

Every strategy must implement at minimum `should_enter` and `should_exit`. An optional `on_start` hook runs once before the bar loop and is useful for pre-computing indicator series to avoid O(n²) per-bar rolling computation.

```python
# ── Variables injected per bar by the backtest engine (Phase 4) ──────────
# row  : dict        — {'date', 'open', 'high', 'low', 'close', 'adj_close', 'volume'}
# hist : pd.DataFrame — all bars from start up to and including the current bar
# p    : dict        — your params dict from strategies.config["params"]
# pos  : dict | None — None when flat; else {'entry_price', 'entry_date', 'shares'}

import pandas as pd
import numpy as np

# Optional — called once before the bar loop starts
def on_start(hist: pd.DataFrame, p: dict) -> None:
    pass

def should_enter(row: dict, hist: pd.DataFrame, p: dict) -> bool:
    """Return True to open a long position at this bar's close price."""
    ...

def should_exit(row: dict, hist: pd.DataFrame, p: dict, pos: dict) -> bool:
    """Return True to close the current position at this bar's close price."""
    ...
```

**Allowed imports:** `pandas`, `numpy` only. No network access, no filesystem. Execution timeout: 30 seconds per backtest. Memory cap: 256MB. `print()` output is captured and surfaced in the console panel.

> **Execution sandbox (Phase 4, revised):** Strategy code will run in an isolated subprocess per backtest — not in-process `RestrictedPython`. The worker spawns a locked-down Python subprocess (resource limits via `resource.setrlimit` for CPU/memory, a hard wall-clock timeout, no network namespace) that executes only the user's `should_enter`/`should_exit`/`on_start` functions against the bar loop, and communicates results back over stdout/a pipe as JSON. This gives real OS-level process isolation (a crashed or hung strategy can't take down the Celery worker) instead of relying on `RestrictedPython`'s AST-level restrictions, which have had known sandbox-escape bypasses. The `ast.parse()` authoring-time check in Phase 3 is unchanged — it is still just a fast syntax/lint pass, not the security boundary.

---

### Predefined Templates

Six code templates ship with Phase 3. Selecting one loads its code into Monaco — fully editable from that point. Templates are static strings served from the backend; no DB write happens when a template is selected.

| Template | Entry condition | Exit condition |
|---|---|---|
| Blank slate | `...` with inline API comments | `...` |
| SMA crossover | `fast_sma > slow_sma` | `fast_sma < slow_sma` |
| RSI threshold | `RSI(14) < oversold` | `RSI(14) > overbought` |
| MACD signal | MACD line crosses above signal line | MACD line crosses below signal line |
| Bollinger breakout | Price crosses above upper band | Price drops below middle band |
| Mean reversion | Z-score vs rolling mean below threshold | Z-score returns to zero |

Served from `GET /strategies/templates` as a list of `{name, description, code, default_params}` objects. Defined as static strings in `backend/app/services/strategy_templates.py`.

---

### Code Validation

Validation uses `ast.parse()` — no code is executed. Runs in under 5ms. Checks for:
1. Valid Python syntax
2. Presence of `should_enter` and `should_exit` function definitions
3. Banned imports (anything other than `pandas`, `numpy`)

```python
import ast

def validate_strategy_code(code: str) -> list[str]:
    """Returns a list of error strings. Empty list means valid."""
    errors = []
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"Syntax error on line {e.lineno}: {e.msg}"]

    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    if "should_enter" not in defined:
        errors.append("Missing required function: should_enter(row, hist, p)")
    if "should_exit" not in defined:
        errors.append("Missing required function: should_exit(row, hist, p, pos)")

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in ("pandas", "numpy"):
                    errors.append(f"Import not allowed: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] not in ("pandas", "numpy"):
                errors.append(f"Import not allowed: from {node.module} import ...")

    return errors
```

The frontend calls `POST /strategies/validate` on a 500ms debounce as the user types. Validation errors are rendered as red squiggles directly in Monaco via `monaco.editor.setModelMarkers()` using the line number from the error response.

---

### Monaco Editor Integration

Monaco is loaded via `@monaco-editor/react` as a Next.js dynamic import with `ssr: false` to avoid server-side rendering errors (Monaco uses browser APIs unavailable in Node.js).

```tsx
// components/strategy/monaco-editor.tsx
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />
})
```

**Install:** `npm install @monaco-editor/react`

**Configuration:**
- Theme: `vs-dark`
- Language: `python`
- Font: `JetBrains Mono` (loaded via `next/font/google` or a CDN fallback)
- Line numbers: on
- Minimap: off (too narrow in the split-pane layout)
- Word wrap: off
- `Cmd/Ctrl + S` keyboard shortcut wired to the save action via `editor.addCommand`

The editor mounts with the selected template code pre-loaded. Code is stored in local React state (not Zustand — it does not need to be globally shared), and debounced to the `/strategies/validate` endpoint every 500ms.

---

### Params JSON Editor

A plain monospace `<textarea>` below the Monaco editor holds the `params` JSON dict. On blur: parse and pretty-print, or show an inline "Invalid JSON" error. The params value is sent as-is to the backend which stores it in `config.params`. The user defines whatever keys their strategy code reads via `p["key"]`.

No special frontend logic is needed — the params editor is just a textarea that validates JSON.

---

### New Folder Structure (Phase 3 additions only)

```
backend/app/
├── routers/
│   └── strategies.py              # CRUD + /validate + /templates endpoints
├── schemas/
│   └── strategy.py                # StrategyCreate, StrategyUpdate, StrategyResponse
└── services/
    ├── strategy_service.py        # CRUD with ownership checks, validate_strategy_code()
    └── strategy_templates.py      # 6 static template objects (name, description, code, default_params)

alembic/versions/
└── 004_add_strategy_soft_delete.py  # Adds is_deleted BOOLEAN DEFAULT false to strategies

frontend/
├── app/(dashboard)/
│   └── strategies/
│       ├── page.tsx               # Strategy list with "New strategy" button + empty state
│       ├── new/page.tsx           # Create new strategy — renders StrategyForm in create mode
│       └── [id]/
│           └── page.tsx           # View/edit strategy — StrategyForm pre-filled with saved code
├── components/
│   └── strategy/
│       ├── monaco-editor.tsx      # Dynamic-imported Monaco wrapper (ssr: false, vs-dark, python)
│       ├── strategy-form.tsx      # Full layout: config panel + Monaco editor + params editor + actions
│       ├── template-picker.tsx    # 6 cards — click to load code into Monaco
│       ├── params-editor.tsx      # Monospace textarea — JSON parse + pretty-print on blur
│       ├── validation-badge.tsx   # Green tick (0 errors) or red "N errors" with first message
│       ├── strategy-card.tsx      # Card in list view: name, 2-line code preview, actions
│       └── console-panel.tsx      # Collapsible <pre> block — placeholder for Phase 4 output
└── lib/
    └── hooks/
        └── use-strategy-validation.ts  # 500ms debounced POST /strategies/validate with error state
```

---

### New FastAPI Endpoints (Phase 3)

| Method | Path | What it does |
|---|---|---|
| `GET` | `/strategies` | Returns all non-deleted strategies for the authenticated user |
| `POST` | `/strategies` | Validates code with `ast.parse()`, creates strategy row, returns `StrategyResponse` |
| `GET` | `/strategies/{id}` | Returns a single strategy — ownership-checked |
| `PUT` | `/strategies/{id}` | Updates name, description, or config — re-validates code on update |
| `DELETE` | `/strategies/{id}` | Soft-delete: sets `is_deleted = true`, does not remove the row |
| `POST` | `/strategies/validate` | Validates code string — no DB write, no execution, returns `{valid: bool, errors: []}` |
| `GET` | `/strategies/templates` | Returns the 6 predefined template objects |

---

### Build Sequence — Step by Step

#### Day 7: Strategy Model + Backend CRUD

- [x] Write Alembic migration `004_add_strategy_soft_delete` — adds `is_deleted BOOLEAN DEFAULT false` to `strategies` table; run it
- [x] Create `backend/app/schemas/strategy.py` — `StrategyConfig`, `StrategyCreate`, `StrategyUpdate`, `StrategyResponse`
- [x] Create `backend/app/services/strategy_templates.py` — 6 static template objects with code strings and `default_params`
- [x] Create `backend/app/services/strategy_service.py` — CRUD functions with ownership checks; `validate_strategy_code()` using `ast.parse()` checking for `should_enter`, `should_exit`, and banned imports
- [x] Create `backend/app/routers/strategies.py` — all 7 endpoints; validation runs before any DB write on `POST` and `PUT`
- [x] Register strategies router in `backend/app/main.py`
- [x] **Verify:** `POST /strategies/validate` with missing `should_exit` returns `{valid: false, errors: ["Missing required function: should_exit(row, hist, p, pos)"]}`. `GET /strategies/templates` returns 6 objects. `POST /strategies` with valid code creates a row; `DELETE /strategies/{id}` sets `is_deleted = true` without removing the row

#### Day 8: Monaco Editor

- [x] Install `@monaco-editor/react`: `cd frontend && npm install @monaco-editor/react`
- [x] Create `frontend/components/strategy/monaco-editor.tsx` — dynamic import, `vs-dark` theme, `python` language, minimap off, `Cmd/Ctrl+S` command wired
- [x] Create `frontend/lib/hooks/use-strategy-validation.ts` — 500ms debounced `POST /strategies/validate` that returns `{valid, errors}` and maps error line numbers to Monaco marker format
- [x] Create `frontend/components/strategy/validation-badge.tsx` — green tick when `errors.length === 0`, red pill with count + first error message otherwise; updates as user types
- [x] Create `frontend/components/strategy/params-editor.tsx` — monospace textarea, JSON parse + pretty-print on blur, inline "Invalid JSON" error on bad input
- [x] Create `frontend/components/strategy/template-picker.tsx` — 6 cards with name + description; clicking calls `GET /strategies/templates`, finds the matching template, and calls an `onSelect(code, default_params)` callback to load into Monaco
- [x] **Verify:** Monaco editor loads without SSR errors. Typing invalid Python triggers the validation badge within 500ms. Selecting "SMA crossover" template populates the editor with the correct code. Introducing a syntax error adds a red squiggle at the correct line

#### Day 9: Strategy Form + List

- [x] Create `frontend/components/strategy/strategy-form.tsx` — split layout: left config panel (name, description, position size, stop loss) + right Monaco editor + below params editor + save/discard action row; handles both create and edit modes via a `mode` prop
- [x] Create `frontend/components/strategy/strategy-card.tsx` — shows name, 2-line monospace code preview with fade-out, description, `created_at`, Edit / Delete / Run (placeholder) actions
- [x] Create `frontend/app/(dashboard)/strategies/page.tsx` — fetches `GET /strategies`, renders list of `StrategyCard` components; empty state: "No strategies yet — create your first one" with a "New strategy" button
- [x] Create `frontend/app/(dashboard)/strategies/new/page.tsx` — renders `StrategyForm` in create mode with "Blank slate" template pre-loaded
- [x] Create `frontend/app/(dashboard)/strategies/[id]/page.tsx` — fetches `GET /strategies/{id}`, renders `StrategyForm` pre-filled with existing code and params
- [x] Wire `POST /strategies` on form submit; redirect to `/strategies/{id}` on success
- [x] **Verify:** Create a strategy → appears in the list with a 2-line code preview. Click it → existing code and params load correctly into the Monaco editor

#### Day 10: Console Panel + Final Polish

- [x] Create `frontend/components/strategy/console-panel.tsx` — collapsible `<pre>` block; in Phase 3, renders placeholder text "Console output will appear here when you run a backtest." Ready for Phase 4 to wire in real `print()` output
- [x] Wire Monaco editor markers: after each validation call, pass the error list to `monaco.editor.setModelMarkers()` so errors appear as red squiggles at the correct line number in the editor
- [x] Add `Cmd/Ctrl + S` shortcut inside Monaco to call the save action without needing the mouse
- [x] Template picker: add a code preview pane (read-only Monaco, 8 lines) that renders the template code before the user confirms loading it — gives a "before you commit" look
- [x] Ensure strategy cards show a `<pre>` snippet of the first 2 lines of `config.code` with a CSS fade-out gradient at the bottom
- [x] **Verify end-to-end:** Select "MACD signal" template → preview pane shows MACD code → load it → set params `{"fast": 12, "slow": 26, "signal": 9}` → save → card appears in list with MACD code snippet → click card → code and params reload exactly as saved → modify and re-save → changes persist

---

### Phase 3 Milestone

> At the end of Phase 3 you can:
> - Navigate to Strategies → New Strategy
> - Select the "SMA crossover" template and see Python code load into the Monaco editor
> - Introduce a syntax error — a red squiggle appears at the correct line and the validation badge shows the error count within 500ms
> - Fix the error — the badge turns green
> - Set params `{"fast": 20, "slow": 50}`, give the strategy a name, hit save
> - The strategy card appears in the list with a 2-line code preview
> - Click the card — the Monaco editor reloads the saved code exactly as written
> - Check PostgreSQL: `SELECT id, name, config->>'params' as params FROM strategies;` → rows with code and params stored in JSONB
> - Delete a strategy — `is_deleted` is set to `true` in the DB; the row is not removed; past backtests (Phase 4) can still reference it

---

## Phase 4: Backtest Engine (Days 11–14)

> Status: ✅ Complete (not yet verified live — Docker Desktop was not running during implementation; run `docker compose up --build` and exercise the flow before treating this as fully confirmed).

### Goals

Let a user submit a backtest (strategy + ticker + date range + initial capital), run it safely in the isolated subprocess sandbox, compute standard performance metrics, and persist results and trades.

### Tables (extended, not new)

`backtests` and `trades` were already created by Phase 1's initial migration. Phase 4 added two columns to `backtests` rather than introducing new tables:

| Table | Columns added in Phase 4 |
|---|---|
| `backtests` | `initial_capital` `NUMERIC(12,4)` (default 10000), `error_message` `TEXT` (nullable) |

> `ticker` remained a plain `VARCHAR(20)` (not `ticker_id`) and `status` kept its existing Phase 1 enum values `pending`/`running`/`done`/`failed` (not `completed`) — see Decisions Log. `trades.pnl`/`pnl_pct` also stayed `FLOAT` (already existing from Phase 1) rather than moving to `DECIMAL(12,4)`, to avoid an unplanned migration on a column that already existed and works.

### API endpoints

- `POST /backtests` — validates strategy ownership, creates a row with status `pending`, queues `run_backtest.delay(id)`, and returns the row immediately
- `GET /backtests/{id}` — polls status and results (frontend polls every 2s while status is `pending`/`running`)
- `GET /backtests` — lists backtests for the authenticated user
- `GET /backtests/{id}/trades` — paginated trade log (`page`/`page_size` query params)

### Celery task: `run_backtest(backtest_id)`

1. Loads the strategy code/params/position sizing, the ticker, and price history for the requested date range from the DB (via `task_db_session()`, same fork-safe pattern as `fetch_ohlcv`)
2. Serialises everything to JSON and pipes it to `backend/app/workers/sandbox/harness.py` via `subprocess.run([sys.executable, harness_path], input=..., timeout=30)`
3. The harness `exec()`s the strategy code against a restricted `__builtins__` (banned: `open`, `exec`, `eval`, `compile`, `input`, `breakpoint`; `__import__` is wrapped to only allow `pandas`/`numpy`), applies `resource.setrlimit` for `RLIMIT_CPU` (25s) and `RLIMIT_AS` (256MB) where the POSIX `resource` module is available, steps bar-by-bar building `hist` as a growing `DataFrame` slice, calls `on_start` once then `should_enter`/`should_exit` per bar, and applies position sizing + stop-loss itself (the user's code only emits signals)
4. The user's own `print()` output is captured via `contextlib.redirect_stdout` into a separate `console_output` string so it never corrupts the single JSON result line the harness writes to real stdout as its return channel
5. The parent task computes metrics from the harness's trade list and equity curve: total return, CAGR, Sharpe ratio (annualised via `sqrt(252)`), max drawdown, win rate, average trade duration
6. Bulk-inserts `Trade` rows and updates `backtests.results` (`{metrics, equity_curve, console_output}`) and `status`; on subprocess timeout, non-zero exit, malformed output, or a harness-reported error, status becomes `failed` with `error_message` set (truncated to 2000 chars)

### Frontend

- `components/backtest/backtest-form.tsx` — ticker/date-range/initial-capital form, reached from a strategy card's "Run" button (`/backtests/new?strategyId=...`)
- `components/backtest/backtest-detail-client.tsx` — polls `GET /backtests/{id}` every 2s while pending/running, then renders a metrics grid, a plain trade table, and the captured console output once `done`, or the error message if `failed`
- `components/backtest/backtest-list-client.tsx` + `app/(dashboard)/backtests/page.tsx` — list of the user's backtests with a status badge
- Sidebar gained a "Backtests" nav link; the strategy card's previously-disabled "Run" button now links to the new-backtest form

Equity curve charting, the drawdown chart, and entry/exit markers on the candlestick chart are explicitly Phase 5 scope — Phase 4's detail page shows metrics and the raw trade log only.

### Known limitation (logged, not fixed in this phase)

True network isolation for the subprocess isn't practical without extra container privileges. The sandbox relies on the timeout, the memory limit, the restricted-builtins `__import__` check, and Phase 3's `ast.parse()` banned-import check together, rather than a network namespace. This is intentional for a portfolio-scope project.

---

## Phase 5: Visualisations (Days 15–18)

> Status: ⏳ Not started.

### Goals

Turn a completed backtest into something readable, all charts built from Recharts/D3 per the project's no-embeds principle.

### Components

- Equity curve chart: portfolio value over time, with an optional buy-and-hold benchmark line overlaid for comparison
- Drawdown chart beneath it: shaded area showing percentage down from peak
- Metrics cards: total return, CAGR, Sharpe ratio, max drawdown, win rate, total trades
- Trade log table: sortable, paginated, entry/exit price and date, PnL per trade
- Entry/exit markers plotted directly on the existing Phase 2 candlestick chart, so the user can see exactly where the strategy fired against real price action
- Results page polls `GET /backtests/{id}` while status is `running`, shows a progress state, then renders everything above once status is `completed`

---

## Phase 6: Advanced Features (Days 19–22)

> Status: ⏳ Not started.

### Goals

Round out the backtester with features that go beyond a single run, using the tools already reserved for this phase (Gemini free tier, Resend, slowapi).

### Planned features

- **Gemini 1.5 Flash summary**: plain-English explanation of a backtest's results (for example, entry count, whether it mostly fired during downtrends, comparison to buy-and-hold) shown on the results page
- **Backtest comparison**: select 2+ backtests and overlay their equity curves on one chart
- **Parameter sweep / grid search**: run a strategy across a full grid of param value combinations using a Celery `group`/`chord`, with a results table ranking combinations by a chosen metric (confirmed in scope, full grid rather than a scaled-down preset list)
- **Email notifications** via Resend: when a long-running backtest finishes, email the user a link to the results
- **Rate limiting** via `slowapi` on backtest submission and strategy validation endpoints, since both are compute/subprocess-bound

---

## Phase 7: Containerisation and Deployment (Days 23–25)

> Status: ⏳ Not started.

### Goals

Ship the project on the fully free deployment stack already committed to (Fly.io backend, Vercel frontend), with production-grade container and CI/CD setup.

### Planned work

- Multi-stage production Dockerfiles for frontend and backend, plus `docker-compose.prod.yml`
- Nginx reverse proxy in front of the API (already listed in the infra table)
- GitHub Actions: run tests on push, build images, deploy on merge to main
- Fly.io: api, worker, redis, and Postgres (Fly Postgres or a managed free tier)
- Vercel hobby for the frontend, environment variables and secrets configured on both platforms
- Health check endpoints and basic structured logging
- Final README pass with setup instructions and screenshots or a demo

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
| Phase 2 | SEC EDGAR `company_tickers.json` over paid ticker APIs (Polygon.io, Finnhub) | Completely free, no API key, maintained by the US government, returns ~10k tickers with CIK numbers for cross-referencing |
| Phase 2 | `DECIMAL(12,4)` for all price columns in `price_history` over `FLOAT` | Avoids floating-point rounding errors on financial data — `FLOAT` can silently misrepresent prices at high precision |
| Phase 2 | BRIN index on `price_history.date` over standard B-tree | BRIN is far smaller and faster for naturally ordered sequential data; backtests always query by date range, which is exactly what BRIN is optimised for |
| Phase 2 | TTL split: 15 minutes for recent OHLCV, 24 hours for fully historical ranges | Past prices never change after adjustment — there is no reason to re-fetch a range that ended before today. Recent data may update during market hours, so a shorter TTL applies |
| Phase 2 | Upsert-on-conflict for all `price_history` inserts | Makes `fetch_ohlcv()` safe to retry without creating duplicate rows — Celery tasks can be re-queued on failure |
| Phase 2 | Stored `adj_close` separately from `close` | Backtesting requires split- and dividend-adjusted prices; keeping both lets the UI display raw close prices in the chart while backtest calculations always use `adj_close` |
| Phase 2 | Staleness defined as: latest stored date is more than 1 day behind today | Allows a 1-day lag for weekends and market holidays without triggering unnecessary re-fetches on every request |
| Phase 2 | `fetch_ohlcv()` returns a Celery job ID on first call rather than blocking | yfinance downloads can take 2–5 seconds for large date ranges; returning a job ID immediately and polling `/status/{job_id}` keeps the API response time under 100ms |
| Phase 2 | `seed_tickers_from_edgar()` is triggered by Celery's `worker_ready` signal, not `on_after_finalize` | `on_after_finalize` fires whenever the Celery app object is finalized, including when it's merely imported by the `api` container (e.g. to call `.delay()`) — that would seed on every API import, not just once per worker boot. `worker_ready` only fires inside an actual running worker process |
| Phase 2 | Celery tasks use `asyncio.run(...)` wrapping an async DB/Redis call instead of a sync SQLAlchemy session | The rest of the codebase is async-only (asyncpg, async SQLAlchemy); wrapping keeps one database access pattern instead of maintaining a second sync engine just for Celery |
| Phase 2 | Added `requests` to `backend/requirements.txt` explicitly | Needed directly to call the SEC EDGAR JSON endpoint; previously only present as an undeclared transitive dependency of `yfinance` |
| Phase 2 | Zustand and Recharts installed via `npm install` during this phase | Not present in Phase 1's `package.json`; Phase 1 only scaffolded auth/dashboard, which didn't need charts or a global store |
| Phase 2 | Bumped `yfinance` from `0.2.51` to `1.5.1` | `0.2.51` could not complete Yahoo Finance's cookie/crumb handshake in live testing (`YFTzMissingError`, HTTP 401 "Invalid Cookie") — Yahoo tightened bot detection since that release. `1.5.1` was verified live against `yf.download()` and `Ticker.history()` before pinning |
| Phase 2 | Celery tasks (`fetch_ohlcv`, `seed_tickers_from_edgar`) create their own throwaway async engine per call via `app/workers/task_utils.py::task_db_session()`, instead of importing the shared `app.database.SessionLocal` | Celery's prefork pool forks worker child processes from a master that has already imported `app.database` (and so already created its module-level async engine/connection pool). asyncpg connections are not fork-safe, and each Celery task call also gets a brand-new event loop via `asyncio.run()` — reusing one shared engine across forked processes and event loops produced two distinct live failures under concurrent load: `asyncpg.exceptions.InterfaceError: cannot perform operation: another operation is in progress` and `RuntimeError: ... attached to a different loop`. A dedicated engine created and disposed inside each task's own coroutine avoids sharing any connection across processes or loops |
| Phase 2 | `fetch_ohlcv()` caches an empty result for 60s when yfinance returns no rows (delisted/invalid symbol, or a transient provider error), instead of caching nothing | Caching nothing on failure meant the frontend's job-status poll loop (`PriceChart` → `getJobStatus` → sees "success" → calls `getMarketData` again → cache miss → re-triggers `fetch_ohlcv`) hammered yfinance in a tight ~2.5s loop for any symbol that briefly failed, observed live against a real ticker during testing |
| Phase 2 | `market_data_service.py`'s cache/DB coverage check verifies both `covers_start()` (earliest cached row is within 7 days of the requested `start`) and `covers_end()`, not just "is the latest row fresh" | The original check only looked at whether the *latest* row was recent. A custom range starting earlier than data already cached from a prior query (e.g. requesting 2010 after already having 2022+ cached) silently matched that later data and served an incomplete series — found live when an early custom start date rendered a chart clipped to whatever had already been fetched. `covers_end()` also fixes a second latent bug: comparing the latest row to *today* made any historical range (end date in the past) permanently look "never fresh," forcing a pointless re-fetch on every single request for that range even when the data was already complete |
| Phase 2 | `DateRangePicker` commits a typed date to the shared store only `onBlur`, with a plausibility check (4-digit year ≥ 1900), instead of on every `onChange` | Native `<input type="date">` fires `onChange` on every keystroke while typing a segment — typing "2020" into the year walks the field through "0002" → "0020" → "0200" → "2020", each committing a full network request. Confirmed live in the API access logs. Beyond wasting requests, this created a race: whichever request happened to resolve *last* (not the one matching what was actually typed) is what rendered, making the chart appear to silently "revert" after a second edit |
| Phase 2 | `PriceChart`'s X-axis ticks are computed explicitly (`computeTicks()` — up to 10 evenly-spaced bars by index, always including the true first/last) instead of using Recharts' `interval="preserveStartEnd"` + `minTickGap` | That heuristic combo mislabeled the axis start once the bar count got large (e.g. a 5-year NVDA range showed "Jan '22" as the leftmost label even though the underlying data correctly started mid-2021, confirmed by inspecting the raw cached response) — the data was always correct, only the tick heuristic was wrong |
| Phase 2 | `PriceChart` defaults to candlestick (OHLC) view rather than a line chart | Candlestick provides more information per bar — open, high, low, close all visible simultaneously, which is what a developer inspecting price action actually needs. Line chart is still available as a toggle for cleaner long-range trend views |
| Phase 2 | Candlestick rendered via a custom Recharts `Bar` shape (`CandlestickBar`) rather than adding a separate financial charting library | Keeps one charting library (Recharts + D3, already in the stack) for both chart types; the custom shape accesses `props.yAxis.scale` — the live d3 scale Recharts passes to every custom shape — to correctly position open/high/low/close pixel coordinates from the payload. No additional dependency needed |
| Phase 2 | `trades` table price columns use `DECIMAL(12,4)` instead of `FLOAT` | Consistent with the Phase 2 decision on `price_history`. FLOAT silently accumulates rounding errors on financial values; DECIMAL is exact. Backtest PnL calculations that chain many multiplications amplify any per-trade rounding error, so precision matters here more than in the chart layer |
| Phase 3 | Monaco Editor loaded via `@monaco-editor/react` with `ssr: false` dynamic import | Monaco uses browser-only APIs (`window`, `document`, `requestAnimationFrame`) that are unavailable in Node.js; server-side rendering it throws a module-not-found or runtime error. Dynamic import with `ssr: false` defers loading to the client entirely |
| Phase 3 | Code validation uses `ast.parse()` at authoring time, not code execution | `ast.parse()` validates syntax and checks for `should_enter`/`should_exit` definitions and banned imports without running anything. Safe, fast (< 5ms per validation call), requires no sandboxing. The real execution boundary is in Phase 4 (RestrictedPython). Two layers: fast feedback at authoring time, hard enforcement at run time |
| Phase 3 | Single `code` JSONB field over typed strategy configs with a `type` enum | Removes all strategy-type restrictions permanently. The user can write SMA crossover, RSI, MACD, Bollinger Bands, mean reversion, multi-leg strategies, ML model scoring, or anything expressible in Pandas — all without any backend changes. Adding a new "strategy type" is just writing new code in Monaco |
| Phase 3 | `params` stored as a free-form JSON dict the user defines entirely | No frontend changes are required when the strategy logic evolves. If the user changes `p["fast"]` to `p["lookback_period"]` in their code, they update the params textarea — nothing else changes. Typed parameter schemas would require frontend form updates on every strategy logic change |
| Phase 3 | Soft-delete (`is_deleted = true`) rather than hard-delete for strategies | A strategy may be referenced by past backtests stored in `backtests.strategy_id`. Hard-deleting the strategy row would orphan those backtest records and break the results page. Soft-delete keeps referential integrity and lets the backtest history page still show the strategy name and code for historical context |
| Phase 3 | Strategies list page is a server component that fetches the initial `GET /strategies` data with the NextAuth session token, handing the array to a small client component (`StrategyListClient`) only for delete interactivity | Keeps the list's first paint server-rendered (no loading spinner on navigation) while still allowing optimistic client-side removal on delete, without making the whole page a client component just for one button's `onClick` |
| Phase 3 | Card/link styling uses `Link` with `buttonVariants({...})` classes directly instead of `<Button asChild><Link/></Button>` | This project's shadcn setup uses `@base-ui/react`, whose `Button` has no `asChild` prop (base-ui uses a `render` prop instead and recommends styling anchor tags directly) — same constraint as the Phase 1 sidebar/header decision, recurring here for the strategy card's Edit link |
| Phase 3 | Strategy card renders `created_at` with a hand-rolled UTC `YYYY-MM-DD` formatter instead of `Date.toLocaleDateString()` | `toLocaleDateString()` with no explicit locale resolves to the *runtime's* default locale — confirmed live to differ between the Next.js server process (rendered `12/07/2026`) and the browser (rendered `7/12/2026`), which is a textbook React hydration mismatch on any server-rendered list of strategies. A fixed, explicit format removes the ambiguity entirely regardless of where it renders |
| Phase 3 | Discovered live: this dev container's `next dev --turbopack` does not reliably pick up file changes written from the host through the Windows bind mount — edits landed on disk (confirmed via `docker compose exec frontend cat <file>`) but kept serving the pre-edit compiled output until `docker compose restart frontend` | `WATCHPACK_POLLING=true` (set in `docker-compose.dev.yml`) is a Webpack/Watchpack-specific escape hatch for exactly this class of bind-mount problem — it does not apply to Turbopack's own file watcher, which appears to miss native filesystem events that don't cross the Windows→WSL2/Docker boundary reliably. Until this is fixed with a Turbopack-specific polling flag, expect to restart the `frontend` container after editing files from the host while `docker compose up` is already running |
| Phase 3 | Banned imports enforced at both authoring time (Phase 3, `ast.parse()`) and execution time (Phase 4, isolated subprocess) | Defence in depth. The authoring check gives the user instant inline feedback. The execution check is the real security boundary that cannot be bypassed. A malicious user who crafts a payload that bypasses the AST check still hits the execution sandbox |
| Phase 2 (fixed in Phase 3 QA) | Candlestick mode was documented as shipped in Phase 2 but never actually rendered — `chartType` didn't exist in the Zustand store, `candlestick-bar.tsx` didn't exist, and `price-chart.tsx` only ever rendered a `Line`. Found live when the user reported still seeing a line chart | The original Phase 2 checklist and milestone claimed this was "confirmed live," which was inaccurate — likely written ahead of the actual implementation and never caught because the line chart still looked reasonable. Lesson: milestone checkmarks need an actual browser check against the specific claim (candlestick, not just "a chart renders"), not just "the page loads" |
| Phase 3 QA | `props.yAxis.scale` (the originally spec'd way to access the y-scale inside a custom `Bar` `shape`) does not exist on this Recharts version's shape props; a hook-based approach (`useXAxisScale`/`useYAxisScale`/`usePlotArea` from a custom component rendered directly as a chart child, and also via the `Customized` wrapper) computed correct pixel coordinates and logged successfully but its returned JSX never actually committed to the DOM in either case, with no thrown error — confirmed by adding an unconditional hardcoded probe `<rect>` that also never appeared, ruling out any data/logic bug in the render path itself | Recharts 3.9.2 substantially rewrote the internal architecture (Redux-based state, `useAppSelector` hooks) versus the v1/v2 APIs the original plan assumed. The fix that actually works: give `<Bar>` an array-valued (`[min, max]`) `dataKey` — Recharts' native "range bar" support, which passes both ends through the real `yAxis.scale.map` internally — and use the fully-documented, stable `shape` render-prop for styling. Two such Bars (thin "wick" spanning `[low, high]`, wider "body" spanning `[min(open,close), max(open,close)]`) reproduce a candlestick using only public, working Recharts API surface |
| Phase 3 QA | Price `YAxis` domain and ticks are explicitly rounded/computed (`priceMin`/`priceMax` floored/ceiled to 2dp, 6 evenly-spaced `ticks`) rather than passing raw `Math.min(...lows)*0.99` / `Math.max(...highs)*1.01` floats with automatic tick generation | Confirmed live: an unrounded domain like `[10.70486972808838, 238.90539321899413]` caused Recharts' automatic tick generator to render garbled labels — e.g. `1899413`, which is literally the tail digits of `238.90539321899413` — instead of a formatted price. This is the same class of bug as the already-documented X-axis `computeTicks()` fix; Recharts' automatic tick placement in this version isn't trustworthy for either axis with real (non-round) data |
| Phase 3/4 | Phase 4 execution sandbox changed from in-process `RestrictedPython` to an isolated OS subprocess per backtest (resource limits + timeout + no network namespace) | `RestrictedPython` only restricts at the AST/bytecode level and has had documented sandbox-escape bypasses; it also runs in the same process as the Celery worker, so a successful escape or an uncaught crash can affect the worker itself. A subprocess gives real OS-level isolation — a hung or crashed strategy is killed and cleaned up without touching the worker process. Phase 3's `ast.parse()` authoring-time validation is unaffected either way; it was always a fast lint pass, not the security boundary |
| Phase 4 (planning) | Position sizing and stop-loss are applied by the backtest harness, not the user's strategy code | Keeps user-authored strategies limited to entry/exit signals, which is all the sandbox API contract (`row`, `hist`, `p`, `pos`) exposes. Risk management logic living in the harness also means it's consistent and auditable across every strategy, rather than reimplemented (or skipped) inconsistently by each user |
| Phase 4 (planning) | Network isolation for the subprocess sandbox is out of scope; the timeout, memory limit, and Phase 3 banned-import check are treated as the combined security boundary | True network namespacing isn't practical without extra container privileges on the target deployment (Fly.io free tier). Documented here explicitly so the gap reads as a scoped decision rather than an oversight |
| Phase 6 (planning) | Parameter sweep runs a full grid search over param combinations (via Celery `group`/`chord`), not a scaled-down preset list | Confirmed directly with the user; kept as originally planned despite adding more implementation complexity than a preset-combo shortcut would |
| Phase 4 | Kept the Phase 1 `backtests`/`trades` schema as-is (ticker `VARCHAR`, status enum `pending`/`running`/`done`/`failed`, `trades` price columns `FLOAT`) instead of the `ticker_id`/`completed`/`DECIMAL` shape sketched in the Phase 4 planning section, only adding `initial_capital` and `error_message` columns | The tables were already created and in use by the initial migration by the time Phase 4 was implemented. Renaming the enum value or switching to a `ticker_id` FK would have required a data migration and touched already-working code (Trade inserts, existing model relationships) for no functional gain — `ticker` as a plain symbol string is exactly what every other part of the codebase already keys off of (Strategy, PriceHistory lookups by symbol) |
| Phase 4 | Strategy execution sandbox is a real OS subprocess (`subprocess.run([sys.executable, harness.py], ...)`), not an in-process call | Matches the Phase 3/4 planning decision already logged above. A hung or crashed strategy is killed by the timeout/OS without touching the Celery worker process |
| Phase 4 | The harness redirects the user's own `print()` output into a separate captured string (`console_output`) instead of leaving it on real stdout | The parent task's only contract with the subprocess is a single JSON line on stdout as the return channel. Any interleaved `print()` from user code would corrupt that JSON and make every strategy that logs anything fail to parse |
| Phase 4 | Position sizing and stop-loss enforcement live entirely in `harness.py`, not in a separate step after the fact | Matches the Phase 4 planning decision — keeps the boundary between "what the user's code decides" (enter/exit signals) and "what the platform guarantees" (position sizing, risk limits) sharp and auditable in one place |
| Phase 4 | `run_backtest` re-fetches the `Backtest` row from a fresh `task_db_session()` before writing final results, rather than reusing the session/object from the initial data-loading query | `AsyncSession.rollback()` expires all attached objects, and refreshing an expired attribute on an `AsyncSession` requires an `await` that isn't available from a plain attribute access — touching the original object after any rollback risks a `MissingGreenlet` error. Re-querying in a new session sidesteps this entirely, at the cost of one extra query |
| Phase 4 | Frontend backtest detail page shows a metrics grid and a plain HTML trade table only — no equity curve chart, no drawdown chart, no entry/exit markers on the candlestick | Those are explicitly scoped to Phase 5 in this document. Building them now would duplicate work once Phase 5's chart components exist and risk drifting from whatever chart conventions Phase 5 settles on |

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

# --- Phase 2 commands ---

# Run Alembic migrations (run after adding tickers and price_history models)
docker compose exec api alembic upgrade head

# Create a new migration after editing models
docker compose exec api alembic revision --autogenerate -m "add price_history table"

# Manually trigger ticker seeding (if the worker startup signal did not fire)
docker compose exec worker celery -A app.workers.celery_app call app.workers.tasks.seed_tickers.seed_tickers_from_edgar

# Check how many tickers were seeded
docker compose exec db psql -U postgres -d backtester -c "SELECT COUNT(*) FROM tickers;"

# Check price history rows for a specific ticker
docker compose exec db psql -U postgres -d backtester -c "SELECT COUNT(*), MIN(date), MAX(date) FROM price_history ph JOIN tickers t ON t.id = ph.ticker_id WHERE t.symbol = 'AAPL';"

# Test ticker search endpoint
curl "http://localhost:8000/tickers/search?q=AAPL"

# Test market data endpoint (triggers fetch on first call)
curl "http://localhost:8000/market-data/AAPL?start=2023-01-01&end=2023-12-31"

# Check Redis cache keys
docker compose exec redis redis-cli KEYS "tickers:search:*"
docker compose exec redis redis-cli KEYS "ohlcv:*"

# Inspect a specific cache value
docker compose exec redis redis-cli GET "tickers:search:AAPL"

# Clear all OHLCV cache entries (force re-fetch on next request)
docker compose exec redis redis-cli --scan --pattern "ohlcv:*" | xargs docker compose exec -T redis redis-cli DEL

# --- Phase 3 commands ---

# Install Monaco Editor React wrapper
cd frontend && npm install @monaco-editor/react

# Run soft-delete migration for strategies table
docker compose exec api alembic upgrade head

# Test strategy code validation endpoint (should return missing should_exit error)
curl -X POST "http://localhost:8000/strategies/validate" \
  -H "Content-Type: application/json" \
  -d '{"code": "def should_enter(row, hist, p):\n    return True"}'

# Test validation with banned import (should return import error)
curl -X POST "http://localhost:8000/strategies/validate" \
  -H "Content-Type: application/json" \
  -d '{"code": "import os\ndef should_enter(row, hist, p):\n    return True\ndef should_exit(row, hist, p, pos):\n    return False"}'

# Fetch all predefined strategy templates
curl "http://localhost:8000/strategies/templates"

# Create a new strategy (replace <token> with a real JWT from /users/login)
curl -X POST "http://localhost:8000/strategies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SMA crossover",
    "description": "Fast MA crosses above slow MA",
    "config": {
      "code": "import pandas as pd\ndef should_enter(row, hist, p):\n    fast = hist[\"adj_close\"].rolling(p[\"fast\"]).mean().iloc[-1]\n    slow = hist[\"adj_close\"].rolling(p[\"slow\"]).mean().iloc[-1]\n    return fast > slow\ndef should_exit(row, hist, p, pos):\n    fast = hist[\"adj_close\"].rolling(p[\"fast\"]).mean().iloc[-1]\n    slow = hist[\"adj_close\"].rolling(p[\"slow\"]).mean().iloc[-1]\n    return fast < slow",
      "params": {"fast": 20, "slow": 50},
      "position_size": 0.10,
      "stop_loss": 0.05
    }
  }'

# List all strategies for the authenticated user
curl "http://localhost:8000/strategies" \
  -H "Authorization: Bearer <token>"

# Soft-delete a strategy (sets is_deleted = true, does not remove the row)
curl -X DELETE "http://localhost:8000/strategies/<strategy-id>" \
  -H "Authorization: Bearer <token>"

# Verify soft-delete worked — row should still exist with is_deleted = true
docker compose exec db psql -U postgres -d backtester \
  -c "SELECT id, name, is_deleted FROM strategies ORDER BY created_at DESC LIMIT 5;"

# Inspect strategy config stored in JSONB
docker compose exec db psql -U postgres -d backtester \
  -c "SELECT name, config->>'params' as params, LEFT(config->>'code', 80) as code_preview FROM strategies WHERE is_deleted = false;"

# --- Phase 4 commands ---

# Run the initial_capital/error_message migration
docker compose exec api alembic upgrade head

# Submit a backtest (replace <token> and <strategy-id>)
curl -X POST "http://localhost:8000/backtests" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"strategy_id": "<strategy-id>", "ticker": "AAPL", "start_date": "2023-01-01", "end_date": "2023-12-31", "initial_capital": 10000}'

# Poll a backtest's status/results
curl "http://localhost:8000/backtests/<backtest-id>" -H "Authorization: Bearer <token>"

# Fetch a backtest's trade log
curl "http://localhost:8000/backtests/<backtest-id>/trades" -H "Authorization: Bearer <token>"

# Watch the worker execute the sandboxed strategy subprocess
docker compose logs -f worker
```
