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
│       └── price-chart.tsx        # Recharts ComposedChart (line + volume bars)
└── lib/
    └── hooks/
        └── use-ticker-search.ts   # Debounced search hook (300ms)

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

- **When:** Triggered once on worker container startup via Celery `on_after_finalize` signal
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

- Reads `selectedTicker` and `dateRange` from Zustand store
- On ticker or date-range change: calls `GET /market-data/{symbol}?start={dateRange.start}&end={dateRange.end}`
- Three render states:
  - **Loading:** skeleton placeholder matching the chart dimensions
  - **Fetching (job queued):** "Fetching prices for {SYMBOL}..." with a progress indicator; polls `/market-data/{symbol}/status/{job_id}` every 2 seconds
  - **Loaded:** full Recharts `ComposedChart`
- Chart internals:
  - `Line` for adjusted close price (primary Y-axis)
  - `Bar` for volume (secondary Y-axis, lower opacity)
  - `XAxis` with date ticks formatted as `MMM 'YY`, at exact tick positions computed by `computeTicks()` (picks up to 10 evenly-spaced bars by index, always including the true first/last) rather than Recharts' `interval`/`minTickGap` heuristics — those were found live to mislabel the axis start once the bar count got large, even though the underlying data was correct
  - `YAxis` left with `$` prefix, right with abbreviated volume (e.g. `12.3M`)
  - `Tooltip` showing full OHLCV breakdown on hover
  - `ReferenceLine` at the mean adjusted close price

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
- [x] Create `frontend/components/market-data/price-chart.tsx` — Recharts ComposedChart with line + volume bars
- [x] Create `frontend/app/(dashboard)/market-data/page.tsx` — assembles `TickerSearch` + `PriceChart`
- [x] Add "Market Data" nav link to `frontend/components/layout/sidebar.tsx`
- [x] Add `selectedTicker` field to Zustand store
- [x] **Verify:** Search "TSLA" in the browser → dropdown appears → select Tesla → Recharts chart loads with 2 years of real price history (confirmed live in-browser with NVDA/AAPL, including custom date ranges back to the 1990s and 5Y/MAX presets)

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
```
