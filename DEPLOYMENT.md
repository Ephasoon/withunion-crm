# WithUnion CRM — Deployment Guide

---

## Firebase vs Supabase — the honest answer

### ❌ Firebase is the wrong choice for this project

WithUnion CRM is built on **relational PostgreSQL**: 17 tables, 38 foreign keys,
57 indexes, and dashboard queries that use `JOIN`, `SUM`, `COUNT` and `GROUP BY`.

Firebase's database is **Firestore — a NoSQL document store**. It has:

| Capability we rely on | Firestore |
|---|---|
| SQL `JOIN` across tables | ❌ Not supported |
| `SUM` / `GROUP BY` aggregations | ❌ Not supported |
| Foreign-key integrity | ❌ Not supported |
| Multi-table transactions | ⚠️ Severely limited |
| Complex filtering (our lead search) | ⚠️ Requires composite index per query |

Moving to Firebase would mean **rewriting the entire data layer** — roughly
3–4 weeks of work — and permanently losing the reporting power that makes a CRM
useful. Revenue-by-industry, commission leaderboards and pipeline forecasting
all depend on SQL aggregation.

> Firebase *does* now offer "Data Connect" (PostgreSQL on Cloud SQL), but it
> costs roughly **$50–90/month minimum**, locks you into Google Cloud, and gives
> you nothing that Supabase doesn't give you free.

### ✅ Supabase is the right choice

Supabase **is** PostgreSQL. Our schema runs on it with **zero code changes** —
only the connection string differs.

| | Supabase |
|---|---|
| Database | Real PostgreSQL 15/17 |
| Free tier | 500 MB DB, 1 GB storage, 50k users |
| Our schema | Works as-is |
| Built-in auth | ✅ (we need this next) |
| File storage | ✅ (for contracts/invoices) |
| Realtime | ✅ (live dashboard updates) |
| Region for Ethiopia | `eu-central-1` (Frankfurt) — lowest latency |

**Recommended stack:**

```
Database  →  Supabase        (free, PostgreSQL, auth + storage included)
Hosting   →  Vercel          (free, best Next.js performance)
   or     →  Coolify + VPS   (full control, ~$6/month, Docker included)
```

---

## Do I need to run `npm install` again?

**Yes — once.** `package.json` changed (new scripts, new name, `tsx`).

```powershell
npm install
```

You will **not** need to reinstall again after this.

---

## Path A — Deploy to Supabase + Vercel (recommended)

### 1. Create the Supabase database

1. Go to <https://supabase.com> → **New project**
2. Name: `withunion-crm`
3. Database password: generate a strong one and **save it**
4. Region: **Frankfurt (eu-central-1)** — best latency from Ethiopia
5. Wait ~2 minutes for provisioning

### 2. Copy the two connection strings

**Project Settings → Database → Connection string → URI**

You need both:

| Purpose | Port | Variable |
|---|---|---|
| App runtime (pooled) | `6543` | `DATABASE_URL` |
| Migrations (direct) | `5432` | `DIRECT_URL` |

Replace `[YOUR-PASSWORD]` with the password from step 1.

### 3. Point your local `.env` at Supabase

Open `.env` and add these two lines (leave the `DB_*` lines — they're ignored
once `DATABASE_URL` exists):

```env
DATABASE_URL=postgresql://postgres.abcdefgh:YOURPASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.abcdefgh:YOURPASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### 4. Create the tables and demo data on Supabase

```powershell
npm run db:push
npm run db:seed
```

TLS is detected and enabled automatically — nothing else to configure.

Verify in Supabase → **Table Editor**: you should see all 17 tables.

### 5. Deploy to Vercel

```powershell
npm i -g vercel
vercel
```

Or connect the GitHub repo at <https://vercel.com/new>.

### 6. Add environment variables in Vercel

**Project → Settings → Environment Variables**

| Key | Value |
|---|---|
| `DATABASE_URL` | the `6543` pooled URL |
| `DIRECT_URL` | the `5432` direct URL |
| `JWT_SECRET` | a long random string |
| `JWT_REFRESH_SECRET` | another long random string |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | optional |

Generate secrets with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 7. Verify

Visit `https://your-app.vercel.app/api/health`:

```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "provider": "supabase",
    "ssl": true
  }
}
```

---

## Path B — Deploy to Coolify (your own VPS)

You mentioned Coolify in the original plan. This gives full control and costs
about **$6/month** on Hetzner or DigitalOcean.

### 1. Push to GitHub

```powershell
git init
git add .
git commit -m "WithUnion CRM v1.0"
git remote add origin https://github.com/YOUR_USERNAME/withunion-crm.git
git push -u origin main
```

> `.gitignore` already excludes `.env` — your secrets stay private.

### 2. In Coolify

1. **New Resource → Application → Public/Private Repository**
2. Select your repo
3. Build Pack: **Dockerfile** (already included)
4. Port: `3000`

### 3. Add a PostgreSQL database in Coolify

**New Resource → Database → PostgreSQL 17**

Coolify generates an internal connection string — copy it.

### 4. Set environment variables in Coolify

```
DATABASE_URL=<the internal PostgreSQL URL from Coolify>
NODE_ENV=production
JWT_SECRET=<random 96-char hex>
JWT_REFRESH_SECRET=<random 96-char hex>
ORG_NAME=WithUnion Technologies
ORG_CURRENCY=ETB
```

### 5. Deploy, then initialise the schema

After the first deploy, open the app terminal in Coolify:

```bash
npm run db:push
npm run db:seed
```

### 6. Add your domain + SSL

Coolify → **Domains** → add `crm.yourdomain.com`.
Let's Encrypt certificates are issued automatically.

---

## Path C — Run everything locally with Docker

```powershell
docker compose up -d
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
```

Open <http://localhost:3000>

---

## Environment variable reference

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | production | Overrides all `DB_*` values |
| `DIRECT_URL` | Supabase/Neon | Used only by `db:push` |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | local dev | Ignored when `DATABASE_URL` is set |
| `DB_SSL` | rarely | Auto-detected; `true`/`false` to force |
| `DB_MAX_CONNECTIONS` | rarely | Auto: 1 serverless / 10 managed / 20 local |
| `JWT_SECRET` | yes | Long random string |
| `JWT_REFRESH_SECRET` | yes | Different long random string |
| `OPENAI_API_KEY` | no | Blank = built-in AI engine |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Only for Supabase Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Only for Supabase Storage |

---

## Pre-launch security checklist

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` regenerated (not the dev defaults)
- [ ] `.env` is **not** committed to Git (`git status` should never list it)
- [ ] Supabase database password is strong and stored in a password manager
- [ ] `NODE_ENV=production` set on the host
- [ ] Custom domain with HTTPS enabled
- [ ] Supabase → Database → **Enable Point-in-Time Recovery** (paid tier) or
      schedule `pg_dump` backups
- [ ] Authentication implemented *(not yet built — see roadmap)*

---

## Cost comparison

| Setup | Monthly | Best for |
|---|---|---|
| Supabase Free + Vercel Free | **$0** | MVP, first customers |
| Supabase Pro + Vercel Pro | ~$45 | Growing SaaS |
| Coolify + Hetzner CX22 | ~$6 | Full control, cost-sensitive |
| Firebase Data Connect | ~$50–90 | ❌ Not recommended |

**Recommendation: start on Supabase Free + Vercel Free ($0), migrate to Coolify
when you exceed the free tiers.**

---

## Known limitation before you go live

⚠️ **There is no authentication yet.** Anyone with the URL can view all data.

Do not deploy publicly with real customer data until login is implemented.
That is the single most important remaining task.
