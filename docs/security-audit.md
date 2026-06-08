# Security audit — BMS Crew Hiring

Last reviewed: 2026-06-02

This document tracks security findings for the hiring stack (Astro/Webflow frontend, Azure Functions API, Azure SQL). Severity: **P0** critical, **P1** high, **P2** medium, **P3** low/informational.

## Architecture summary

- Public applicants use same-origin `/hiring/api/hire/*` proxy.
- Admin and office portals use `/hiring/api/admin/*` and `/hiring/api/office/*`.
- Schedule links authenticate via high-entropy tokens in the URL (not cookies).
- Office ICS feeds authenticate via secret URL tokens.

## Findings and status

| ID | Severity | Finding | Status | Notes |
|----|----------|---------|--------|-------|
| SEC-01 | P0 | `POST /schedule/book` did not verify slot ∈ generated availability | **Fixed** | `assertSlotBookable()` in `apps/api/src/lib/scheduleSlots.ts` |
| SEC-02 | P0 | Admin login allowed default password `"admin"` when hash unset | **Fixed** | Fail closed in production (`isProduction()`) |
| SEC-03 | P0 | CAPTCHA bypass when secret missing in non-production | **Fixed** | Requires explicit `CAPTCHA_DISABLED=true` for dev bypass |
| SEC-04 | P1 | No rate limiting on login or schedule mutations | **Fixed** | Login 20/hr/IP; book 10/hr/token; reschedule 5/hr/token |
| SEC-05 | P1 | 500 errors echoed internal `Error.message` to clients | **Fixed** | Generic message in `apps/api/src/http/router.ts` |
| SEC-06 | P1 | ICS feed URLs expose applicant name/interest if leaked | Open | Secret-URL model; rotate via Admin → Offices |
| SEC-07 | P2 | No CSRF tokens on admin/office mutations | Open | Mitigated by SameSite=Lax + same-origin proxies |
| SEC-08 | P2 | Webhook URLs not validated (SSRF) | Open | Phase B: HTTPS-only + block private IPs |
| SEC-09 | P2 | `customFields` unbounded on applications | Open | Phase B: max keys/size in Zod schema |
| SEC-10 | P2 | Schedule tokens in query strings (Referer/history) | Open | Path-style URLs supported via `_redirects` |
| SEC-11 | P3 | Public schedule preview exposes live slots | Accepted | Intentional admin preview tool |
| SEC-12 | P3 | JWT sessions not revocable server-side | Open | Document; optional session version later |

## Production configuration checklist

Before go-live, verify in Azure Function App settings:

- [ ] `ADMIN_PASSWORD_HASH` set (bcrypt); default `"admin"` disabled in production
- [ ] `SESSION_SIGNING_SECRET` — random, ≥32 characters
- [ ] `CAPTCHA_SECRET` set; `CAPTCHA_DISABLED` **not** set
- [ ] `ALLOWED_ORIGINS` lists production Webflow/www origins only
- [ ] Azure Portal CORS on Function App left empty (app sets CORS)
- [ ] `SQL_CONNECTION_STRING` and messaging keys never exposed to browser
- [ ] ICS feed tokens treated as secrets; regenerate if disclosed

## Manual test checklist

- [ ] Brute-force admin login → 429 after limit
- [ ] POST book with off-grid datetime → 409
- [ ] Expired schedule token → 410
- [ ] Invalid ICS token → 404
- [ ] Office JWT cannot access `/admin/*`
- [ ] Application honeypot filled → 400
- [ ] CORS preflight from disallowed origin → 403

## Remediation phases

### Phase A (shipped with reschedule)

- Slot validation on book/reschedule
- Sanitized 500 responses
- Login and schedule rate limits
- Production fail-closed for admin password and CAPTCHA

### Phase B (planned)

- Webhook URL validation (HTTPS, no private IPs)
- `customFields` size limits
- Stricter production env validation at startup

### Phase C (optional)

- CSRF header for admin mutations
- Reduce PII in ICS SUMMARY
- Path-only schedule tokens in outbound email/SMS templates
