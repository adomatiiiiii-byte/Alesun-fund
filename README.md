# Alesun Fund Monorepo

Production-ready monorepo for the Alesun Fund lending platform, organized into clean frontend, backend, and database boundaries without changing application behavior.

## Structure

```text
alesun-fund-dashboard/
├── frontend/   # React + Vite applicant portal and admin portal
├── backend/    # Node.js + Express API, auth, workflows, tests
├── database/   # SQL schema, Prisma reference schema, migrations
├── docs/
├── scripts/
├── docker-compose.yml
├── package.json
└── README.md
```

## Responsibilities

### `frontend/`

- React pages, components, routes, and styling
- Vite build configuration
- Frontend-only environment variables

### `backend/`

- Express app and API routes
- business logic, risk engine, accounting metrics, and loan workflows
- Prisma client usage
- backend tests and seed scripts
- backend-only environment variables

### `database/`

- SQL schema snapshot in [database/schema.sql](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/database/schema.sql)
- Prisma schema reference in [database/prisma/schema.prisma](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/database/prisma/schema.prisma)
- SQL migrations in [database/migrations](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/database/migrations)

## Environment Files

### Frontend

Create or edit [frontend/.env](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/frontend/.env):

```env
VITE_API_URL=http://localhost:4000/api
REACT_APP_API_URL=http://localhost:4000/api
```

`VITE_API_URL` is the active Vite setting. `REACT_APP_API_URL` is also supported for compatibility during the refactor.

### Backend

Copy [backend/.env.example](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/backend/.env.example) to `backend/.env` and set your real values:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alesun_fund
JWT_SECRET=change-me
UPLOAD_DIR=./uploads
```

## Install

From the repository root:

```bash
npm install
```

Or per workspace:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run Locally

### Backend

```bash
cd backend
npm run prisma:generate
npm run prisma:push
npm run seed
npm start
```

Backend health:

- [http://localhost:4000/health](http://localhost:4000/health)

### Frontend

```bash
cd frontend
npm run dev
```

Frontend:

- [http://localhost:5173](http://localhost:5173)

## Workspace Scripts

From the root [package.json](/C:/Users/Personal/Desktop/alesunFund/codex1/alesun-fund-dashboard/package.json):

- `npm run dev:frontend`
- `npm run dev:backend`
- `npm run build:frontend`
- `npm run test:backend`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`

## Docker

```bash
docker compose up
```

## Seed Credentials

- Admin: `admin@alesunfund.local` / `Password123!`
- Credit Officer: `credit@alesunfund.local` / `Password123!`
- Field Officer: `field@alesunfund.local` / `Password123!`

## Verification Checklist

- frontend and backend are physically separated
- database assets live under `database/`
- frontend API base URL is environment-driven
- no backend-only secrets are stored in frontend files
- backend tests and frontend build should pass after install
