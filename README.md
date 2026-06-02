# BMS Crew Hiring

Multi-office hiring workflow: job applications, interview scheduling, and automated email/SMS notifications. Built for [Webflow Cloud](https://webflow.com/feature/cloud) (Astro frontend) and [Azure Functions](https://azure.microsoft.com/products/functions) (API + scheduled reminders).

**Repository:** [github.com/tkdlax/BMS-crew-hiring](https://github.com/tkdlax/BMS-crew-hiring)

## What it does

1. **Apply** — Mobile-first application forms per office and role (`/hiring/apply/{office}/{job}`).
2. **Invite** — After submit, applicants receive a unique email link to schedule an interview.
3. **Schedule** — Built-in slot picker (office calendar); booking sends email + SMS confirmation.
4. **Remind** — Configurable reminders (e.g. 24h email, 2h SMS) with quiet-hours rules per office.

Offices (e.g. Colorado Springs, Denver) each have jobs (Driver, Crew Member, etc.), shared calendars per office, and config-driven message templates.

## Architecture

```
Webflow Cloud (Astro)          Azure Functions              Azure SQL
─────────────────────          ───────────────              ─────────
/hiring/apply/...      ──►    POST /api/applications  ──►  hire_*
/hiring/schedule/...   ──►    GET/POST /api/schedule/*
/hiring/admin/...      ──►    /api/admin/*            ◄──  templates, config

                               Timer (every 5 min)     ──►  reminder_jobs
                                    │                      SendGrid + Twilio
                                    └──────────────────►
```

| Layer | Technology |
|-------|------------|
| Frontend | Astro 5, static on Webflow Cloud mount `/hiring` |
| API | Azure Functions v4 (Node 22) — 1 HTTP + 1 timer |
| Database | Azure SQL (`hire_*` tables) |
| Email | SendGrid |
| SMS | Twilio |
| CAPTCHA | Cloudflare Turnstile (or reCAPTCHA) |

## Repository layout

```
apps/web/              Astro site (apply, schedule, admin)
apps/api/              Azure Functions API
packages/shared/       Zod schemas, template placeholder helpers
db/migrations/         SQL schema + seed data
docs/deployment.md     Production deployment checklist
scripts/               DB migrations, password hashing
```

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) v4
- Azure SQL (or SQL Server for local development)
- (Production) SendGrid, Twilio, Turnstile keys

## Local development

### 1. Clone and install

```bash
git clone https://github.com/tkdlax/BMS-crew-hiring.git
cd BMS-crew-hiring
npm install
```

### 2. Configure API

```bash
cp apps/api/local.settings.example.json apps/api/local.settings.json
```

Edit `apps/api/local.settings.json`:

- Set `SQL_CONNECTION_STRING` to your database.
- Leave `MESSAGING_DISABLED=true` to skip SendGrid/Twilio locally.
- Default admin login uses password `password` (see `ADMIN_PASSWORD_HASH` in the example file).

Generate a new admin password hash:

```bash
npm run hash-password -- "your-secure-password"
```

### 3. Configure web

```bash
cp apps/web/.env.example apps/web/.env
```

Set `PUBLIC_API_BASE_URL=http://localhost:7071/api` (and optional `PUBLIC_CAPTCHA_SITE_KEY`).

### 4. Database

```bash
# PowerShell
$env:SQL_CONNECTION_STRING="Server=...;Database=...;User Id=...;Password=...;Encrypt=true;TrustServerCertificate=true"
npm run db:migrate
```

Seed includes offices **colorado-springs** and **denver**, with **driver** and **crew-member** jobs, availability Mon–Fri 9–5, and default email/SMS templates.

### 5. Run

```bash
# Terminal 1 — API at http://localhost:7071
npm run dev:api

# Terminal 2 — Web at http://localhost:4321/hiring
npm run dev:web
```

### 6. Try it

| Page | URL |
|------|-----|
| Home | http://localhost:4321/hiring/ |
| Careers | http://localhost:4321/hiring/careers/ |
| Apply (example) | http://localhost:4321/hiring/apply/denver/crew-member/ |
| Admin | http://localhost:4321/hiring/admin/login/ |

## Applicant URLs (production)

| Page | Path |
|------|------|
| Careers index | `https://{site}.webflow.io/hiring/careers/` |
| Apply | `https://{site}.webflow.io/hiring/apply/{officeSlug}/{jobSlug}/` |
| Schedule (from email) | `https://{site}.webflow.io/hiring/schedule/?token={token}` |
| Admin | `https://{site}.webflow.io/hiring/admin/` |

Schedule links are **per-applicant** (cryptographic token, expiry, single-use after booking).

## API overview

Base path: `/api`

| Endpoint | Description |
|----------|-------------|
| `GET /public/openings` | Active office/job list |
| `GET /public/jobs/{office}/{job}` | Job page data |
| `POST /applications` | Submit application + send invite |
| `GET /schedule/{token}` | Schedule page context |
| `GET /schedule/{token}/slots` | Available time slots |
| `POST /schedule/{token}/book` | Book interview |
| `POST /admin/login` | Admin session cookie |
| `GET/POST /admin/offices`, `/jobs`, `/templates`, … | Admin CRUD |

All outbound messages use one pipeline: `sendMessage({ templateKey, channel, context, scope })` with template inheritance **job → office → global**.

## Environment variables

### Webflow Cloud (`apps/web`)

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_BASE_URL` | Azure Function App URL + `/api` |
| `PUBLIC_SITE_BASE_URL` | e.g. `https://yoursite.webflow.io/hiring` |
| `PUBLIC_CAPTCHA_SITE_KEY` | Turnstile site key |
| `PUBLIC_BASE_PATH` | `/hiring` |

### Azure Function App (`apps/api`)

| Variable | Description |
|----------|-------------|
| `SQL_CONNECTION_STRING` | Azure SQL |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | Email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | SMS |
| `TWILIO_FROM_NUMBER_CO`, `TWILIO_FROM_NUMBER_UT` | Regional SMS sender numbers (office slug → region) |
| `TWILIO_FROM_NUMBER` | Optional fallback if regional number not set |
| `CAPTCHA_SECRET`, `CAPTCHA_PROVIDER` | `turnstile` or `recaptcha` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash |
| `SESSION_SIGNING_SECRET` | JWT signing (32+ chars) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `PUBLIC_SITE_BASE_URL` | Used in schedule links in emails |
| `MESSAGING_DISABLED` | `true` for local dev only |

See [docs/deployment.md](docs/deployment.md) for full deployment steps (Azure + Webflow Cloud + GitHub Actions).

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspaces |
| `npm run build` | Build shared, API, and web |
| `npm run dev:api` | Start Functions locally |
| `npm run dev:web` | Start Astro dev server |
| `npm run db:migrate` | Run SQL migrations + seed |
| `npm run hash-password -- "secret"` | Generate bcrypt hash for admin |
| `npm run test -w @bms/api` | Run API unit tests |

## CI / deploy

- **CI:** `.github/workflows/ci.yml` — build + test on push/PR.
- **API deploy:** `.github/workflows/deploy-api.yml` — deploy to Azure when secrets are set:
  - `AZURE_FUNCTIONAPP_NAME`
  - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`

Webflow Cloud connects to this repo and deploys `apps/web` on push (configure mount path `/hiring` in site settings).

## Security notes

- Application forms: CAPTCHA, rate limits, honeypot field.
- Schedule links: random tokens, expiry, single-use after book.
- Admin: bcrypt password, HttpOnly session cookie.
- Secrets only in Azure / Webflow env — never commit `local.settings.json` or `.env`.

## License

Private — BMS internal use unless otherwise specified.
