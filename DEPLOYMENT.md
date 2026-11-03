# WithUnion CRM — Deployment Guide

This guide covers the current application: Next.js 16 standalone output, the
`src/proxy.ts` auth gate, DB-backed sessions, document uploads under
`STORAGE_DIR`, and the Docker/Coolify deployment flow.

---

## 1. Prerequisites

- Node.js 22+ for local work
- Docker Engine + Docker Compose for the container path
- PostgreSQL 15/17 (local container, Supabase, Neon, Railway, or a VPS)
- A strong `DEMO_PASSWORD` and `DB_PASSWORD` for any non-local deployment

> The app does not use JWT secrets. Sessions are opaque tokens stored in the
> `sessions` table and sent in an `httpOnly` cookie.

---

## 2. Environment variables

Copy the example file and fill in values locally:

```powershell
Copy-Item .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | production | Full PostgreSQL URL. Overrides all `DB_*` values. |
| `DIRECT_URL` | Supabase/Neon | Non-pooled URL used by `db:push` and migrations. |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | local dev | Used when `DATABASE_URL` is absent. Compose builds `DATABASE_URL` from these. |
| `DB_HOST_PORT` | no | Host port for the Compose database, bound to `127.0.0.1`. Default: `5433`. |
| `DB_SSL` | rarely | Auto-detected for managed providers. Set `true`/`false` to force. |
| `DB_MAX_CONNECTIONS` | rarely | Auto: 1 serverless / 10 managed / 20 local. |
| `STORAGE_DIR` | Docker | Upload directory. Container default: `/app/storage/uploads`. |
| `SESSION_TTL_DAYS` | no | Session lifetime in days. Default: `7`. |
| `DEMO_PASSWORD` | seeding | Password for seeded demo accounts. Must not be `Withunion2024!` in production. |
| `ALLOW_SEED_WIPE` | seeding | Must be `true` for `db:seed` to run when `NODE_ENV=production`. Seeding deletes all data. |
| `OWNER_EMAIL` `OWNER_NAME` `OWNER_PASSWORD` | first owner | Inputs for `db:create-owner`. Omitted values are prompted for. |
| `OPENAI_API_KEY` | no | Blank falls back to the built-in AI engine. |
| `ORG_NAME` `ORG_CURRENCY` | no | Organisation defaults used by the seeder. |
| `NEXT_PUBLIC_SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` | no | Only if Supabase Storage/Auth is added later. |

Never commit `.env`. `.dockerignore` excludes it from build context.

---

## 3. Path A — Docker Compose (recommended for this codebase)

### 3.1 Configure

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

```env
DB_PASSWORD=replace-with-a-strong-password
DEMO_PASSWORD=replace-with-a-different-strong-password
SESSION_TTL_DAYS=7
```

`docker compose up` refuses to start without `DB_PASSWORD`. The database port is
published only on `127.0.0.1:${DB_HOST_PORT:-5433}`; it is not exposed on the
host's public interfaces.

### 3.2 Start

```powershell
docker compose up -d --build
```

Compose starts:

1. `postgres` and waits for its healthcheck.
2. `migrate` — builds the `tools` Docker stage and runs `npm run db:push`.
3. `app` — starts only after the migration exits successfully.

The app runs as the non-root `nextjs` user (UID 1001). Uploads are stored in
`/app/storage/uploads` and persisted in the `withunion_uploads` named volume.
The image also has a Docker healthcheck against `/api/health`.

### 3.3 Option A — create the first real owner (recommended)

For a real deployment, do **not** seed demo data. Create one owner account in
the existing or a new organization instead:

```powershell
docker compose run --rm -e OWNER_EMAIL=owner@yourcompany.com `
  -e OWNER_NAME="Your Name" -e OWNER_PASSWORD="a-strong-unique-password" `
  -e ORG_SLUG=yourcompany -e ORG_NAME="Your Company" create-owner
```

Or, from a workstation/CI runner that can reach the database:

```powershell
npm run db:create-owner
```

Without `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_PASSWORD`, the script prompts for
them and hides the password input. The password is hashed with scrypt and is
never written to logs. Re-running it for an email that already exists refuses
and makes no changes. To add more users, sign in as the owner and use the
team/settings screens.

### 3.4 Option B — load demo data (destructive)

```powershell
docker compose run --rm seed
```

**Warning:** `db:seed` deletes every existing row — organizations, users,
clients, deals, invoices, documents, sessions — before inserting demo data.
It does not run during normal `up`. In production (`NODE_ENV=production`) it
refuses to run unless `ALLOW_SEED_WIPE=true` is also set, and it refuses the
default demo password. Only use this for demos or a throwaway database.

### 3.5 Verify

```powershell
curl.exe http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

The endpoint returns `503` when the database is unavailable.

### 3.6 Useful commands

```powershell
docker compose logs -f app
docker compose run --rm migrate
docker compose down          # keeps database + upload volumes
docker compose down -v       # deletes database + upload volumes (irreversible)
```

### 3.7 Migrations

This repository currently uses **`drizzle-kit push`** in the `migrate` service.
It is the right fit for now because there is no generated migration history and
the schema is still pre-1.0. Once the schema is live and changes need review,
switch to generated migrations (`drizzle-kit generate`) and apply them with
`drizzle-kit migrate`.

The final runtime image intentionally does **not** include `drizzle-kit` or the
TypeScript source, so use the `migrate` / `seed` services (or the `tools` build
target) instead of `docker compose exec app npm run db:push`.

---

## 4. Path B — Coolify or another VPS

### 4.1 Application

1. Create an Application from your Git repository.
2. Build Pack: **Dockerfile**.
3. Port: `3000`.
4. Set the environment variables from section 2.
5. Mount a persistent volume at `/app/storage` so uploads survive redeploys.
6. Set the healthcheck path to `/api/health`.

### 4.2 Run migrations and create the first owner

The runtime container does not carry migration tooling. Use the tools target
from a machine or CI runner that can reach the database:

```powershell
docker build --target tools -t withunion-tools .
docker run --rm --env-file .env withunion-tools npm run db:push
docker run --rm -it --env-file .env withunion-tools npm run db:create-owner
```

`db:seed` remains available for demo databases only, and it deletes all existing
data. In production it also requires `ALLOW_SEED_WIPE=true`. If Coolify deploys
Docker Compose instead, the `migrate` service handles migrations automatically;
run `docker compose run --rm create-owner` (or `seed` for a demo).

### 4.3 HTTPS and domain

Add the domain in Coolify and enable Let's Encrypt. Keep `NODE_ENV=production`
so session cookies are marked `Secure` and the demo hint stays hidden.

---

## 5. Path C — Supabase + Vercel

This path is suitable for the database and application, but **local document
uploads are not durable on Vercel** because its filesystem is ephemeral. Use a
VPS/Coolify with the `withunion_uploads` volume, or add object storage
(Supabase Storage/S3) before relying on uploads in production.

### 5.1 Database

1. Create a Supabase project in a nearby region.
2. Copy the pooled URL (port `6543`) to `DATABASE_URL`.
3. Copy the direct URL (port `5432`) to `DIRECT_URL`.
4. Run the schema from your workstation or CI:

```powershell
npm install
npm run db:push
```

Create the first real owner (no demo data):

```powershell
$env:OWNER_EMAIL="owner@yourcompany.com"
$env:OWNER_NAME="Your Name"
$env:OWNER_PASSWORD="a-strong-unique-password"
npm run db:create-owner
```

Demo data is optional and destructive — `db:seed` deletes every existing row.
In production it also requires `ALLOW_SEED_WIPE=true`:

```powershell
$env:NODE_ENV="production"
$env:DEMO_PASSWORD="a-strong-unique-password"
$env:ALLOW_SEED_WIPE="true"
npm run db:seed
```

### 5.2 Vercel

1. Import the repository at <https://vercel.com/new>.
2. Add the environment variables from section 2.
3. Deploy.
4. Confirm `https://your-app.vercel.app/api/health` returns `{ "status": "ok" }`.

Do not use the Docker storage volume on Vercel; it does not exist there.

---

## 6. Backups and operations

- Back up PostgreSQL regularly (`pg_dump`) or enable point-in-time recovery.
- Back up the upload volume (`withunion_uploads`) alongside the database.
- Check `/api/health` after every deploy.
- Set `SESSION_TTL_DAYS` to a value that matches your security policy.
- Rotate `DEMO_PASSWORD`, `DB_PASSWORD`, and any provider keys after sharing
  access with a contractor or leaving a hosting provider.

---

## 7. Pre-launch security checklist

- [ ] `DEMO_PASSWORD` changed from `Withunion2024!` (or demo data not seeded)
- [ ] `ALLOW_SEED_WIPE` is unset on production databases
- [ ] First real owner created with `db:create-owner`
- [ ] `DB_PASSWORD` is strong and stored in a password manager
- [ ] `.env` is not committed (`git status` must not list it)
- [ ] `NODE_ENV=production` on the server
- [ ] HTTPS enabled (session cookies use `Secure`)
- [ ] `/api/health` passes
- [ ] `withunion_uploads` volume mounted and writable by `nextjs`
- [ ] Database and upload-volume backups scheduled
- [ ] Login rate limiting reviewed for your number of app instances
- [ ] Dependency audit reviewed (`npm audit`)

---

## 8. Known limitations

- The login rate limiter is in-memory and is per-process. Multiple app
  instances need a shared store such as Redis.
- Local filesystem uploads require a persistent volume or a single app
  instance; serverless platforms need object storage.
- `drizzle-kit push` is convenient but does not produce reviewable migration
  history. Adopt generated migrations before the schema becomes long-lived.
- `db:seed` is destructive: it deletes every row before inserting demo data.
  Never run it against a production database unless you intend to lose data.
- Login is email-based and assumes email addresses are unique across
  organizations (`create-owner` enforces this).
