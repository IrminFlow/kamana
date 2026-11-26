# Kamana

Same interface as the original kamana.in, rebuilt on Vite + Convex + Vercel.
See [docs/PLAN.md](docs/PLAN.md) for the architecture and rules.

```
web/            pages (one index.html per route) + browser TypeScript in web/src
web/public/     original stylesheet, font and data files, served at /static
api/            Vercel functions (send-otp, profile, delete-profile, grievance)
lib/server.ts   shared proxy: same-origin check, client IP, server secret → Convex
convex/         schema, functions, rate limits, Firebase token check, Resend
reference/      snapshot of the old site (HTML, CSS, JS, screenshots); not deployed
```

## Run locally

```bash
npm install
npx convex dev        # terminal 1: Convex backend, pushes functions on save
npm run dev           # terminal 2: http://localhost:5173 (also serves /api)
```

On the dev deployment set `OTP_DEV_MODE=true` (`npx convex env set OTP_DEV_MODE true`):
Firebase is skipped (no SMS) and the code `000000` is accepted.

`.env.local` needs `VITE_CONVEX_URL`, `CONVEX_URL` (same URL) and `SERVER_SECRET`
(must equal the Convex `SERVER_SECRET`).

## Admin

There is no admin UI. Open the Convex dashboard → Data:

- `profiles`: everyone who applied. Set `status` to `hidden` to take a profile down, or delete the row.
- `grievances`: complaints. Change `status` (`received`, `in_review`, `resolved`, `rejected`) and
  `resolutionNote`; the tracking page shows them.

## Deploy

Convex production env vars: `SERVER_SECRET`, `FIREBASE_PROJECT_ID`, `RESEND_API_KEY`, `MAIL_FROM` (e.g. `Kamana <noreply@kamana.in>`),
`GRIEVANCE_INBOX` (e.g. `info@kamana.in`), optional `SITE_URL`.
Never set `OTP_DEV_MODE` on production.

Vercel env vars: `CONVEX_DEPLOY_KEY` (production deploy key), `CONVEX_URL`
(the production `.convex.cloud` URL), `SERVER_SECRET`, and the four public `VITE_FIREBASE_*` values
from the Firebase web app config.

Firebase setup: Authentication → Sign-in method → Phone (enable); Settings → Authorized domains
(add kamana.in and the Vercel domain); SMS region policy → allow India only; Blaze plan for SMS.
The Vercel build runs `convex deploy`, which pushes functions and injects `VITE_CONVEX_URL`.

## Daily profile report

The Convex schedule sends a report to `info@kamana.in` at 12:10 a.m. India time.
It covers the previous calendar day and sends an email on days with no new profiles.
Deploy Convex with `RESEND_API_KEY` and a verified `MAIL_FROM` configured.
