# Student Application Portal — Aadhaar Verification

A full-stack web application for student applications with Aadhaar verification via IDfy DigiLocker.

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│   Frontend (React)  │    │  Backend (Express.js) │    │  Database          │
│   Vercel Free Tier  │◄──►│  Render Free Tier     │◄──►│  Supabase (Free)   │
└─────────────────────┘    └──────────────────────┘    └────────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │   IDfy DigiLocker    │
                           │   (Aadhaar API)      │
                           └──────────────────────┘
```

## Tech Stack

| Layer      | Technology                |
|------------|---------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Query, React Hook Form, React Router |
| Backend    | Node.js, Express.js       |
| Database   | Supabase PostgreSQL        |
| Hosting    | Vercel (FE) + Render (BE) |
| Verification | IDfy DigiLocker          |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A Supabase project (free at supabase.com)
- IDfy API credentials

### 1. Clone & setup

```bash
git clone <your-repo>
cd student-portal
cp .env.example .env
# Fill in your .env values
```

### 2. Run database migrations

Open your Supabase project → SQL Editor → paste contents of:
```
database/001_initial_schema.sql
```
Click **Run**.

### 3. Start backend

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev
# Runs on http://localhost:3001
```

### 4. Start frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:5173
```

### 5. Or use Docker Compose

```bash
cp .env.example .env   # fill in root .env
docker-compose up --build
```

---

## Deployment

### 1. Supabase (Database)

1. Sign up at [supabase.com](https://supabase.com)
2. Create new project, note your **database URL** and **service role key**
3. Go to SQL Editor → run `database/001_initial_schema.sql`
4. Settings → API → copy `DATABASE_URL` (use the "connection string" format)

### 2. Render (Backend)

1. Sign up at [render.com](https://render.com)
2. New → Web Service → connect your GitHub repo
3. Set root directory: `backend`
4. Build: `npm install` | Start: `node server.js`
5. Add all environment variables from `backend/.env.example`
6. Note your Render URL: `https://your-app.onrender.com`
7. Update `BACKEND_URL` env var to this URL (for webhook callback)

### 3. Vercel (Frontend)

1. Sign up at [vercel.com](https://vercel.com)
2. Import GitHub repo → select `frontend` as root directory
3. Add env: `VITE_API_URL=https://your-app.onrender.com/api`
4. Update `vercel.json` → replace `your-render-app.onrender.com` with your actual Render URL
5. Deploy

### 4. IDfy Webhook Configuration

In your IDfy dashboard, set the webhook URL to:
```
https://your-app.onrender.com/api/webhook/idfy
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/initiate` | Start Aadhaar verification |
| GET | `/api/verification/status/:requestId` | Poll verification status |
| POST | `/api/webhook/idfy` | IDfy webhook receiver |
| POST | `/api/application/save` | Save/update application |
| GET | `/api/application/:id` | Get application |
| GET | `/api/admin/metrics` | Dashboard metrics |
| GET | `/api/admin/verifications` | List verifications (with search) |
| GET | `/health` | Health check |

---

## Verification Flow

```
User fills form → Clicks "Verify Aadhaar"
        ↓
Backend calls IDfy CreateTask API
        ↓
Backend stores request_id + INITIATED status
        ↓
Frontend opens DigiLocker URL in modal/popup
        ↓
User completes DigiLocker authentication
        ↓
IDfy sends webhook to /api/webhook/idfy
        ↓
Backend extracts: aadhaar_name, aadhaar_state
        ↓
Backend compares form fields vs Aadhaar data
   normalizeName(form_name) == normalizeName(aadhaar_name)  &&
   normalizeState(form_state) == normalizeState(aadhaar_state)
        ↓
Status → VERIFIED or FAILED (with specific message)
        ↓
Frontend polls status → shows result
        ↓
If VERIFIED → user can click Next
```

---

## Matching Logic

### Name Matching (`normalizeName`)
- Converts to uppercase
- Removes special characters
- Collapses whitespace
- Compares all name parts

### State Matching (`normalizeState`)
- Converts to uppercase
- Maps aliases: "Delhi" = "NCT of Delhi" = "New Delhi"
- Full alias list in `backend/utils/matching.js`

---

## Database Schema

### `applications`
Stores student personal and education details.

### `aadhaar_verification`
Stores each verification attempt with IDfy request ID, matching results, and final status.

### `webhook_logs`
Stores complete raw IDfy webhook payloads for audit trail.

---

## Admin Dashboard

Visit `/admin` to view:
- Total applications, verified count, failed count, success rate
- Searchable table of all verifications
- Filter by status

---

## Environment Variables

See `.env.example`, `backend/.env.example`, and `frontend/.env.example` for all required variables.

---

## Notes

- **Free tier cold starts**: Render free tier spins down after inactivity. First request may take ~30s.
- **Webhook in local dev**: Use [ngrok](https://ngrok.com) to expose your local backend for IDfy webhooks:
  ```bash
  ngrok http 3001
  # Use the ngrok URL as BACKEND_URL
  ```
- **Supabase RLS**: The schema enables Row Level Security. The backend must use the `service_role` key (not the `anon` key) to bypass RLS.
