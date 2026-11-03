# WithUnion CRM — Windows Setup Guide

> **Built for African Businesses. Powered by AI.**

---

## Before you start

You already have these installed:

| Tool | Check it works |
|---|---|
| Node.js 20+ | `node --version` |
| PostgreSQL 15+ | Running as a Windows service |
| VS Code | — |

You do **not** need `psql` on your PATH. The setup scripts handle everything.

---

## The whole setup — 4 commands

```powershell
npm install
# → then edit .env and set DB_PASSWORD
npm run setup
npm run dev
```

Open <http://localhost:3000>

---

## Step by step

### 1. Open the project

Unzip to a short path, e.g. `C:\Projects\withunion-crm`
*(avoid Downloads — long paths sometimes break Node tooling)*

In VS Code: **File → Open Folder** → select it.

Open the terminal: **`` Ctrl + ` ``**

### 2. Install dependencies

```powershell
npm install
```

Takes 1–4 minutes. Warnings about deprecated sub-packages are normal.

### 3. Set your PostgreSQL password

Open **`.env`** in VS Code. Find this line:

```env
DB_PASSWORD=postgres
```

Change it to your real PostgreSQL password. Save with `Ctrl+S`.

| Your situation | Set |
|---|---|
| Password is `1234` | `DB_PASSWORD=1234` |
| No password | `DB_PASSWORD=` |
| Different user | `DB_USER=your_user` |
| Different port | `DB_PORT=5433` |

> A new database called `withunion_crm` is created automatically.
> Your existing PostgreSQL databases are never touched.

### 4. Create database + tables + demo data

```powershell
npm run setup
```

Expected output:

```
🗄️  WithUnion CRM — Database Setup
   Provider: local
   Host:     localhost:5432
   Database: withunion_crm
✅ Connected to PostgreSQL server
✅ Database "withunion_crm" created successfully
[✓] Changes applied
🌱 WithUnion CRM — Seeding database
✅ Organization: WithUnion Technologies
✅ Users: 4
✅ Clients: 5
✅ Leads: 5
✅ Deals: 5
✅ Projects: 3
✅ Invoices: 4
🎉 Database seeded successfully!
```

### 5. Start the app

```powershell
npm run dev
```

```
▲ Next.js 16.2.6
- Local:  http://localhost:3000
✓ Ready in 1.2s
```

### 6. Open it

<http://localhost:3000>

You will be redirected to the sign-in page. Use one of the seeded demo accounts:

| Email | Role |
|---|---|
| `abebe@withunion.com` | Owner |
| `tigist@withunion.com` | Manager |
| `dawit@withunion.com` | Sales rep |
| `sara@withunion.com` | Sales rep |

**Password:** `Withunion2024!` (override with `DEMO_PASSWORD` in `.env` before seeding)

Sessions are stored in the `sessions` table as SHA-256 hashes and delivered as an
httpOnly cookie. Change the demo password before any shared or public deployment.

Then work through **`REVIEW.md`** to test every feature.

---

## What `npm run setup` does

| Step | Command | Result |
|---|---|---|
| 1 | `db:create` | Creates the `withunion_crm` database |
| 2 | `db:push` | Creates 17 tables + 57 indexes |
| 3 | `db:seed` | Loads Ethiopian demo data |

---

## All commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run setup` | Create DB + schema + demo data |
| `npm run db:create` | Create database only |
| `npm run db:push` | Sync schema |
| `npm run db:seed` | Reload demo data (deletes all existing rows) |
| `npm run db:create-owner` | Create the first real owner without demo data |
| `npm run db:reset` | Wipe and reseed |
| `npm run db:studio` | Visual database browser |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint |

---

## Pages

| URL | Description |
|---|---|
| `/login` | Sign in (required for every other page) |
| `/dashboard` | KPIs, revenue chart, activity feed |
| `/leads` | Lead table with scoring, search, filters |
| `/clients` | Client grid + table views |
| `/pipeline` | 8-stage Kanban board |
| `/projects` | Project cards with progress |
| `/invoices` | Invoice management |
| `/payments` | Chapa / Telebirr / Stripe transactions |
| `/commissions` | Sales leaderboard |
| `/analytics` | Charts, radar, forecasting |
| `/ai` | AI assistant chat |
| `/notifications` | Alert centre |
| `/settings` | Organization, team, integrations |

---

## Demo data you'll see

**Organization:** WithUnion Technologies (Addis Ababa)

**Team:** Abebe Kebede (CEO), Tigist Alemu (Sales Manager),
Dawit Haile, Sara Mengistu

**Clients:** Capital Construction PLC (ETB 2.1M), Addis Specialty Hospital
(ETB 1.2M), Blue Nile Technologies (ETB 820K), Ethiopia Runners Club
(ETB 450K), Lucy International School (ETB 380K)

**Hottest lead:** Ruth Solomon @ Precision Manufacturing — ETB 1.5M,
negotiation stage, score 85

---

## Troubleshooting

### `psql is not recognized`
Not needed. `npm run db:create` uses the Node driver.

### `ECONNREFUSED`
PostgreSQL isn't running.
`Win + R` → `services.msc` → find `postgresql-x64-17` → **Start**

### `password authentication failed`
`DB_PASSWORD` in `.env` is wrong. Fix it, then rerun `npm run setup`.

### `relation "organizations" does not exist`
```powershell
npm run db:push
npm run db:seed
```

### `Port 3000 is already in use`
```powershell
npm run dev -- -p 3001
```

### Page loads but data is empty
```powershell
npm run db:seed
```
Then hard-refresh with `Ctrl + Shift + R`.

### Start completely fresh
```powershell
npm run db:reset
```

---

## Verify it's healthy

<http://localhost:3000/api/health>

```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "provider": "local",
    "name": "withunion_crm",
    "latencyMs": 1
  }
}
```

---

## Enable real AI (optional)

The assistant works offline out of the box. For GPT-4o:

1. Get a key at <https://platform.openai.com>
2. In `.env`: `OPENAI_API_KEY=sk-proj-…`
3. Restart: `Ctrl+C` then `npm run dev`

`/api/health` will show `"ai": "openai"`.

---

## ⚠️ Before deploying publicly

**There is no authentication yet.** Anyone with the URL can see all data.
Local review is completely safe. Do not put real customer data online until
login is built.

Next steps after your review: see **`DEPLOYMENT.md`**
