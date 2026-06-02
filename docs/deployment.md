# Deployment

## Azure Function App

1. Create a **Function App** (Node 22, Windows or Linux).
2. Create **Azure SQL** (or use existing server) and run migrations:
   ```bash
   SQL_CONNECTION_STRING="..." npm run db:migrate
   ```
3. Configure Application Settings:

| Setting | Description |
|---------|-------------|
| `SQL_CONNECTION_STRING` | Azure SQL connection string |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Verified sender |
| `TWILIO_ACCOUNT_SID` | Twilio SID |
| `TWILIO_AUTH_TOKEN` | Twilio token |
| `TWILIO_FROM_NUMBER_CO` | Colorado SMS from number (E.164) |
| `TWILIO_FROM_NUMBER_UT` | Utah SMS from number (E.164) |
| `TWILIO_FROM_NUMBER` | Optional fallback |
| `CAPTCHA_SECRET` | Turnstile or reCAPTCHA secret |
| `CAPTCHA_PROVIDER` | `turnstile` or `recaptcha` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash |
| `SESSION_SIGNING_SECRET` | Random 32+ char string |
| `ALLOWED_ORIGINS` | Comma-separated site origins, e.g. `https://www.baileysallied.com,https://baileysallied.com,https://baileys-moving-storage.webflow.io` |
| `PUBLIC_SITE_BASE_URL` | `https://www.baileysallied.com/hiring` (its origin is also allowed automatically) |
| `MESSAGING_DISABLED` | `false` in production |

4. Deploy via GitHub Actions (`.github/workflows/deploy-api.yml`) or:
   ```bash
   npm run build -w @bms/api
   func azure functionapp publish <APP_NAME>
   ```

## Webflow Cloud

1. Connect GitHub repo to Webflow Cloud.
2. Set project path: `apps/web`
3. Mount path: `/hiring`
4. Environment variables (injected at **runtime** on Webflow Cloud — redeploy after changing):
   - `PUBLIC_API_BASE_URL` → `https://<function-app>.azurewebsites.net/api` (no trailing slash). Secret or plain both work.
   - `PUBLIC_SITE_BASE_URL` → `https://www.baileysallied.com/hiring` (production)
   - `PUBLIC_CAPTCHA_SITE_KEY` → Turnstile site key
   - `PUBLIC_BASE_PATH` → `/hiring`

   The site loads these via `GET /hiring/api/public-config` (Cloudflare Worker). Local dev still uses `.env` at build time.

   **Admin UI** calls same-origin `/hiring/api/admin/*` (Webflow Worker proxy to Azure) so login is not blocked by cross-origin CORS.

5. Publish the main Webflow site after Cloud environment is created.

### Admin login

- `ADMIN_PASSWORD_HASH` in Azure is a **bcrypt hash**, not the password you type. Use the original plaintext password that was hashed (local dev without a hash uses `password`).
- `ALLOWED_ORIGINS` on the Function App must list every browser origin that calls the API (www and non-www). `PUBLIC_SITE_BASE_URL` adds its origin automatically.
- In the Azure Portal → Function App → **API** → **CORS**: either add the same origins there **or** leave the platform list empty so the app sets headers (avoid conflicting `*` with credentialed requests).
- After changing API CORS or session cookie settings, redeploy the Function App.

## Staging checklist

- [ ] Migrations applied to staging SQL
- [ ] `ALLOWED_ORIGINS` includes staging Webflow URL
- [ ] SendGrid domain authenticated
- [ ] Twilio number verified
- [ ] CAPTCHA keys for production domain
- [ ] Admin password rotated from default
- [ ] Test apply → email → schedule → confirm SMS/email on mobile
- [ ] Test reminder timer (book slot within reminder window in staging config)

## Production checklist

- [ ] `MESSAGING_DISABLED` is not set (or `false`)
- [ ] Application Insights alerts on Function failures
- [ ] CORS origins locked to production domain only
- [ ] Mobile QA on iOS Safari + Android Chrome (apply + schedule from email link)
