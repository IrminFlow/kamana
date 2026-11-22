# Kamana rebuild plan

Goal: the same user-facing interface as the old kamana.in (pixel-identical CSS, markup and
dropdown behaviour), on a new, lightweight backend.

## Stack

| Layer      | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| Frontend   | Vite multi-page app, plain HTML + vanilla TypeScript, no UI framework  |
| Old devices| `@vitejs/plugin-legacy` (polyfilled bundle only served to old browsers)|
| Hosting    | Vercel (static pages + a few Node functions under `/api`)              |
| Database   | Convex                                                                 |
| OTP        | Firebase Phone Auth (Google Cloud); ID token verified in Convex        |
| Email      | Resend (`@convex-dev/resend`)                                          |
| Rate limits| `@convex-dev/rate-limiter` (per phone, per IP, per email, global caps) |
| Admin      | `/admin`: Google sign-in (Firebase), allowlist in `ADMIN_EMAILS`        |

## Why writes go through Vercel `/api` functions

Reads (search, complaint tracking) go straight from the browser to Convex public queries.
Writes (send OTP, submit profile, delete profile, submit complaint) go to same-origin
Vercel functions, which:

1. read the real client IP (Vercel sets `x-real-ip`) for per-IP rate limits, and
2. call Convex functions with a shared `SERVER_SECRET`, so nobody can call the write
   functions directly and skip the IP limits.

## Pages (copied from the old site)

| Route              | Notes                                                                   |
|--------------------|-------------------------------------------------------------------------|
| `/`                | Static                                                                  |
| `/search`          | Form is static; results rendered client-side from a Convex query        |
| `/post`            | Apply form. Send OTP → enter code → Submit verifies + saves in one call |
| `/post/success`    | Rebuilt from the old CSS (`success-page`, `submission-success`)         |
| `/delete`          | New: delete your profile with mobile + OTP (uses existing form styles)  |
| `/grievance`       | Complaint form → reference number `KAM-XXXXXXXXXXXX` + Resend email     |
| `/grievance/track` | Status lookup by reference number                                       |
| `/privacy` `/terms` `/safety` | Static                                                       |

## Data model (Convex)

- `profiles`: name, state, city, pincode, locationMode, trade, jobProfile, expectedSalary,
  specialisation, email, phone (E.164, unique), status (`published` | `hidden`),
  createdAt, updatedAt. Indexes: `by_phone`, `by_state_city`, `by_state_pincode`.
- `grievances`: ticket, name, email, phone, category, profileUrl, details,
  status (`received` | `in_review` | `resolved` | `rejected`), resolutionNote, createdAt.
- Rate limiter and Resend components keep their own tables.

## Rules

- **One profile per phone number.** Submitting again with the same verified number
  replaces the old profile. A warning is shown as soon as an existing number requests an
  OTP, and again on the success page.
- **Delete:** `/delete` asks for mobile + OTP and removes the profile.
- **Moderation:** set `status` to `hidden` in the Convex dashboard to take a profile down.

## Rate limits

| Action            | Limits                                                     |
|-------------------|------------------------------------------------------------|
| Send OTP          | 1/min and 5/hour per phone · 10/hour per IP · 300/hour global |
| Verify OTP        | 5 per 10 min per phone · 30/hour per IP (plus Firebase's own limits) |
| Submit complaint  | 3/hour per IP · 3/hour per email · 100/hour global         |
| Search            | Results capped at 60 per query                             |

## Environment variables

- Vercel: `VITE_CONVEX_URL`, `CONVEX_URL`, `SERVER_SECRET`
- Vercel (public, baked into the page): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- Convex: `SERVER_SECRET`, `FIREBASE_PROJECT_ID`, `RESEND_API_KEY`, `MAIL_FROM`, `GRIEVANCE_INBOX`, `ADMIN_EMAILS` (comma-separated Google accounts allowed into `/admin`), `SITE_URL`
- Local dev without Firebase: `OTP_DEV_MODE=true` on the dev deployment skips the SMS and accepts code `000000`.
