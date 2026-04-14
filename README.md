# AFFILIA

<p align="center">
  <strong>Bridge. Earn. Grow.</strong><br />
  Premium affiliate infrastructure for Kenya, built around verified merchants, realtime affiliate activity, escrow discipline, and controlled admin operations.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.1.7-000000?style=for-the-badge" />
  <img alt="React" src="https://img.shields.io/badge/React-19-111827?style=for-the-badge" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-0f766e?style=for-the-badge" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-16a34a?style=for-the-badge" />
  <img alt="Kenya" src="https://img.shields.io/badge/Market-Kenya-b91c1c?style=for-the-badge" />
</p>

---

## What AFFILIA Is

AFFILIA is a three-surface platform:

- `apps/frontend`: merchant + affiliate experience
- `apps/admin`: restricted operations console
- `apps/backend`: FastAPI layer for sensitive and money-adjacent workflows

It is designed around a strict split:

- `Supabase direct`: auth session, realtime chat/forum, live UI reads, storage uploads
- `Backend API`: deposit submission, payout sweep actions, receipt access, admin approval flows, affiliate smart-link generation, role-gated operational actions

That split is intentional. Realtime and low-risk reads stay fast. Sensitive state changes go through the backend.

---

## Product Surfaces

### Frontend

- merchant dashboard
- affiliate dashboard
- academy / tutor workspace
- community forum + direct chat
- product publishing with moderation
- escrow funding requests
- receipt access

### Admin

- super admin provisioning of admins and tutors
- role-separated admin access
- merchant verification queue
- deposit approvals
- payout sweep operations
- audit and platform oversight

### Backend

- secure token validation against Supabase
- admin permission enforcement
- money-adjacent mutation endpoints
- receipt authorization
- smart-link generation

---

## Architecture

```text
apps/frontend  ----\
                    >  Supabase Auth / Realtime / Storage / Postgres
apps/admin     ----/
        \ 
         \----> apps/backend (FastAPI)
                  - verifies bearer token with Supabase Auth
                  - enforces admin permission boundaries
                  - handles sensitive writes
```

### Source Of Truth

- `database/full_schema.sql`: canonical fresh-project schema
- `database/admin-schema.sql`: admin isolation and access tables
- `database/admin_cred.sql`: bootstrap admin seed
- `database/migrations/*.sql`: incremental migrations

---

## Admin Model

AFFILIA does **not** treat admins as normal application roles.

Admin access is separated through:

- `public.admin_users`
- `public.admin_roles`
- `public.admin_permissions`
- `public.admin_user_roles`

### Super Admin

The bootstrap super admin can:

- provision new admins
- provision academy tutors
- assign operational roles
- issue temporary passwords
- force password rotation on first login

### Managed Admin Accounts

Managed admin accounts are created by the super admin and stored in Supabase Auth plus admin access tables.

Each managed account:

- receives a temporary password
- is flagged with `must_change_password = true`
- can be forced into TOTP
- only sees the admin sections allowed by assigned roles

---

## Backend vs Supabase Responsibilities

### Backend-controlled flows

- merchant verification approval
- deposit approval
- payout sweep execution
- receipt retrieval
- affiliate smart-link generation
- admin provisioning

### Supabase-direct flows

- sign in / sign up
- realtime chat
- realtime forum
- dashboard live reads
- academy live reads
- storage uploads for screenshots, media, avatars

This is the current operating model in the codebase.

---

## Local Development

### Required URLs

- frontend: `http://localhost:6100`
- admin: `http://localhost:6200`
- backend: `http://127.0.0.1:8000`

### Frontend env

`apps/frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_URL=http://localhost:6100
NEXT_PUBLIC_ADMIN_URL=http://localhost:6200
```

### Admin env

`apps/admin/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_URL=http://localhost:6100
NEXT_PUBLIC_ADMIN_URL=http://localhost:6200
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_ADMIN_ACCESS_EMAIL=...
ADMIN_ACCESS_EMAIL=...
ADMIN_ACCESS_PASSWORD=...
```

### Backend env

`apps/backend/.env`

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SECRET_KEY=...
APP_URL=http://localhost:6100
ENVIRONMENT=development
```

---

## Database Setup

Run the canonical schema on a fresh Supabase project:

```sql
database/full_schema.sql
```

Then apply admin and operational additions:

```sql
database/admin-schema.sql
database/admin_cred.sql
database/migrations/010_academy.sql
database/migrations/011_realtime_operations_and_admin_rbac.sql
database/migrations/012_super_admin_provisioning.sql
database/hotfix_chat_rls.sql
```

If chat ever fails with RLS recursion or thread insert issues, `database/hotfix_chat_rls.sql` is the repair script.

---

## Run Locally

### Backend

```bash
cd apps/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd apps/frontend
npm run dev
```

### Admin

```bash
cd apps/admin
npm run dev
```

---

## Vercel Deployment Notes

Both Next.js apps now build with webpack instead of Turbopack:

- `apps/frontend/package.json`
- `apps/admin/package.json`

That was done deliberately because Turbopack was unstable in production builds for this repo.

### Required Vercel environment variables

#### Frontend

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_URL`

#### Admin

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ADMIN_ACCESS_EMAIL`

### Important

If `SUPABASE_SERVICE_ROLE_KEY` is missing on the admin deployment, super-admin provisioning will fail.

---

## Security Posture

Current hardening in the repo:

- separate admin allowlist
- super-admin-only provisioning path
- forced password rotation for managed accounts
- optional TOTP requirement for managed admins
- backend-enforced admin permission checks
- restricted receipt access
- tighter backend CORS and trusted hosts
- service-role helper marked server-only

Still recommended next:

- server-enforced admin IP allowlist
- append-only escrow ledger
- rate limiting on auth, chat, forum, tracking
- dual-approval for large payout sweeps

---

## Useful Files

- `database/full_schema.sql`
- `database/admin-schema.sql`
- `database/admin_cred.sql`
- `database/hotfix_chat_rls.sql`
- `apps/admin/app/api/provision-users/route.ts`
- `apps/admin/lib/hooks/useAdminAccess.ts`
- `apps/backend/app/api/v1/endpoints/admin.py`
- `apps/backend/app/api/v1/endpoints/merchants.py`
- `apps/backend/app/api/v1/endpoints/affiliates.py`
- `apps/backend/app/api/v1/endpoints/receipts.py`

---

## Docs

- `docs/ADMIN_GUIDE.md`
- `docs/MERCHANT_GUIDE.md`
- `docs/AFFILIATE_GUIDE.md`
- `docs/API_DOCUMENTATION.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/SECURITY.md`
- `docs/DATABASE_SCHEMA.md`

---

## Status

The repo is no longer in a placeholder state for core operations.

The current work focuses on:

- backend-sensitive flow routing
- admin account provisioning
- permission separation
- realtime stability
- deployment reliability
