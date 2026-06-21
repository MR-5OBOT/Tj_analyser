# TJ Analyser App

Android-first trading journal app with an HTTPS cloud backend.

This repo is now focused on two parts only:

- `mobile/`: React Native Expo app for Android
- `backend/`: FastAPI backend that accepts CSV/Excel files or links, normalizes journals, runs calculations, and generates PDF reports

## What The App Does

- upload CSV or Excel journals from Android
- paste a remote CSV/Excel link, or a normal **Google Sheets share link** (auto-converted to CSV)
- auto-detect a wide range of journal column names, with a manual **column mapping** screen for odd headers
- accept almost any column layout (a single results column is enough)
- run weekly or overall analysis in the backend
- show a **stats dashboard** in the app and generate a full **PDF report** (charts) in the cloud
- keep a local **history** of past runs on the device
- auto-delete old generated PDFs after a configurable time

## Mobile App (Expo Router)

The app is a React Native / Expo app using Expo Router (file-based navigation), with three
tabs plus two pushed screens:

- **Analyze** tab — pick a file or paste a link, choose report type + sheet index, run.
  Handles free-host cold starts with a "Waking the server…" state.
- **Report** screen — stat cards from the analysis, detected-column chips, and Open / Share PDF.
- **Map Columns** screen — bind your file's headers to internal fields when auto-detect misses.
- **History** tab — saved runs (device-local), reopen any report's PDF.
- **Settings** tab — default report type, backend URL (read-only), clear history.

## Project Structure

Backend:
- [backend/main.py](/home/ys/repos/Tj_analyser/backend/main.py) — FastAPI routes
- [backend/service.py](/home/ys/repos/Tj_analyser/backend/service.py) — load / inspect / analyze
- [backend/url_utils.py](/home/ys/repos/Tj_analyser/backend/url_utils.py) — Google Sheets link → CSV
- [backend/models.py](/home/ys/repos/Tj_analyser/backend/models.py)
- [helpers/reporting.py](/home/ys/repos/Tj_analyser/helpers/reporting.py)

Mobile (Expo Router):
- `mobile/app/_layout.tsx`, `mobile/app/(tabs)/*` — root stack + tabs
- `mobile/app/result.tsx`, `mobile/app/mapping.tsx` — dashboard + column mapping
- `mobile/src/lib/api.ts` — typed API client (health / inspect / analyze, cold-start warmup)
- `mobile/src/state/store.ts` — zustand store (session + history)
- `mobile/src/components/ui.tsx`, `mobile/src/theme/tokens.ts` — design system

## Backend API

- `GET /api/health`
- `GET /api/schema`
- `POST /api/inspect` — preview a file's columns + auto-detected mappings (no analysis/PDF)
- `POST /api/analyze`
- `GET /api/reports/{report_id}`

`POST /api/analyze` and `POST /api/inspect` support:

- multipart file upload
- remote file URL (incl. Google Sheets share links, auto-converted to CSV export)
- report type: `weekly` or `overall` (analyze only)
- Excel sheet index
- manual column mappings
- custom outcome mappings (analyze only)

`POST /api/analyze` returns `stats`, `detected_mappings`, `source_columns`,
`unmapped_columns`, `rows_processed`, and a `download_url`.

## Universal Internal Fields

The backend normalizes journals into these internal fields:

- `trade_date`
- `trade_day`
- `asset`
- `entry_time`
- `exit_time`
- `position_size`
- `outcome`
- `rr`
- `risk_amount`
- `reward_amount`
- `stop_loss_points`
- `session`
- `setup`
- `notes`

Example weird journal headers that can be mapped:

- `data` -> `trade_date`
- `asset` -> `asset`
- `risk` -> `risk_amount`
- `reward` -> `reward_amount`
- `win_loss` -> `outcome`
- `entry time` -> `entry_time`

## Android App Setup

Install dependencies once (Expo's internal peer pins need legacy resolution):

```bash
cd mobile
npm install --legacy-peer-deps
```

Run it in development with Expo Go or a dev build:

```bash
npx expo start
```

The mobile app no longer lets you type the backend URL in Settings.
The backend URL now comes from build config.

Example public mobile env file:
[mobile/.env.example](/home/ys/repos/Tj_analyser/mobile/.env.example)

```text
EXPO_PUBLIC_API_BASE_URL=https://your-backend.koyeb.app
```

For local development you can create:
[mobile/.env.local](/home/ys/repos/Tj_analyser/mobile/.env.local)

```text
EXPO_PUBLIC_API_BASE_URL=https://your-backend.koyeb.app
```

That file is ignored by git.

## Mobile Build Steps

### Build Once For Local Testing

1. Edit or create [mobile/.env.local](/home/ys/repos/Tj_analyser/mobile/.env.local)
2. Put your backend URL in it:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-backend.koyeb.app
```

3. Build the APK:

```bash
cd mobile
eas build -p android --profile preview
```

4. Install the APK on your phone

### Build Again Later

Each time you want a new APK:

1. If backend URL changed, update:
   [mobile/.env.local](/home/ys/repos/Tj_analyser/mobile/.env.local)
2. Run:

```bash
cd mobile
eas build -p android --profile preview
```

### Production / Play Build

For Google Play you should build an AAB, not the preview APK:

```bash
cd mobile
eas build -p android --profile production
```

That uses the `production` profile from [mobile/eas.json](/home/ys/repos/Tj_analyser/mobile/eas.json).

### Production APK Without Google Play

If you want a release-style APK for direct install on your phone without Google Play:

```bash
cd mobile
eas build -p android --profile production-apk
```

That uses the `production-apk` profile from [mobile/eas.json](/home/ys/repos/Tj_analyser/mobile/eas.json).

## EAS Environment Variables

For production builds, the better setup is to use Expo/EAS environment variables instead of a local file.

Set this in Expo/EAS:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-backend.koyeb.app
```

Then build:

```bash
cd mobile
eas build -p android --profile production
```

## Backend Setup

### Local Run

```bash
uv sync
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Run

```bash
docker build -f Dockerfile.backend -t tj-analyser-backend .
docker run --env-file .env.example -p 8000:8000 tj-analyser-backend
```

## Environment Variables

Example env file: [.env.example](/home/ys/repos/Tj_analyser/.env.example)

- `TJ_API_TITLE`
- `TJ_API_VERSION`
- `TJ_ALLOW_ORIGINS`
- `TJ_STORAGE_DIR`
- `TJ_REQUEST_TIMEOUT_SECONDS`
- `TJ_REPORT_TTL_MINUTES`

## Production Host Recommendation

### Best Free Host: Koyeb

Koyeb is the best free fit for this backend right now.

Why:
- current Koyeb docs say the free instance includes `512MB RAM`, `0.1 vCPU`, and `2GB SSD`
- Koyeb automatically gives your app a public `koyeb.app` subdomain
- Koyeb docs also say their network includes TLS encryption, so you get HTTPS without extra work

Official docs:
- https://www.koyeb.com/docs
- https://www.koyeb.com/docs/reference/apps

### Render Fallback

Render is still usable for testing, but its current docs explicitly say free instances are not for production. Use it only if you want a quick backup option.

Official docs:
- https://render.com/docs/free
- https://render.com/docs/deploys

## Koyeb Deployment Steps

1. Push the `mobile-app` branch to GitHub.
2. Create a Koyeb account.
3. Create a new app from your GitHub repo.
4. Choose Docker deployment.
5. Point Koyeb to [Dockerfile.backend](/home/ys/repos/Tj_analyser/Dockerfile.backend).
6. Set the service port to `8000` if Koyeb does not auto-detect it.
7. Add environment variables from [.env.example](/home/ys/repos/Tj_analyser/.env.example).
8. Deploy.
9. Copy the generated HTTPS URL, which should look like `https://your-app-org-hash.koyeb.app`.
10. Use that URL as the mobile build config value for `EXPO_PUBLIC_API_BASE_URL`.

## Production Deployment Checklist

- backend deploys successfully and `GET /api/health` returns `{"status":"ok"}`
- backend public URL is HTTPS, not HTTP
- mobile build config uses the HTTPS Koyeb URL
- file upload works from the APK
- remote CSV/Excel URL import works
- PDF download works from the APK
- `.env` values are set on the host
- `TJ_REPORT_TTL_MINUTES` is set to a value you actually want in production
- generated PDFs are not kept forever unless that is intentional

## Production Notes

This branch is now set up for HTTPS-only mobile usage:

- local Android HTTP allowances were removed
- the app now rejects non-HTTPS backend URLs
- production backend URL should be a public HTTPS host

For a later stronger production version, the next upgrades would be:

- paid host for better reliability
- object storage for PDFs
- auth if multiple users will use it
- background jobs if reports get heavier

## Production Direction

This repo is intentionally kept simpler for your use case:

- backend is separated into API, service, settings, models, and temp-file layers
- report generation is separated into reusable helper modules
- mobile app is split into app root, API client, components, theme, constants, and types

There is no database and no report history layer in this branch.
The app does one job:

- receive file or link
- process journal
- generate PDF
- return PDF link
- clean up old PDFs automatically

## Validation

Backend:

```bash
python -m compileall helpers backend config.py
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
# then: curl the /api/health, /api/inspect, /api/analyze endpoints
```

PDF generation runs headlessly (matplotlib is forced to the `Agg` backend in
[helpers/plot_styling.py](/home/ys/repos/Tj_analyser/helpers/plot_styling.py)), so no
display/Tcl is required on the server.

Mobile:

```bash
cd mobile
npx tsc --noEmit                 # type-check
npx expo export --platform android   # full bundle check (routes + imports)
```
