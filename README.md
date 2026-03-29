# TJ Analyser App

Android-first trading journal app with an HTTPS cloud backend.

This repo is now focused on two parts only:

- `mobile/`: React Native Expo app for Android
- `backend/`: FastAPI backend that accepts CSV/Excel files or links, normalizes journals, runs calculations, and generates PDF reports

## What The App Does

- upload CSV or Excel journals from Android
- paste a remote CSV/Excel link instead of uploading
- map weird journal column names to a universal internal schema
- auto-detect common column names when mapping is empty
- run weekly or overall analysis in the backend
- generate a PDF report in the cloud
- return detected mappings, stats, and a PDF download link
- auto-delete old generated PDFs after a configurable time

## Project Structure

- [mobile/App.tsx](/home/ys/repos/Tj_analyser/mobile/App.tsx)
- [mobile/src/AppRoot.tsx](/home/ys/repos/Tj_analyser/mobile/src/AppRoot.tsx)
- [backend/main.py](/home/ys/repos/Tj_analyser/backend/main.py)
- [backend/service.py](/home/ys/repos/Tj_analyser/backend/service.py)
- [backend/models.py](/home/ys/repos/Tj_analyser/backend/models.py)
- [backend/settings.py](/home/ys/repos/Tj_analyser/backend/settings.py)
- [backend/files.py](/home/ys/repos/Tj_analyser/backend/files.py)
- [helpers/reporting.py](/home/ys/repos/Tj_analyser/helpers/reporting.py)

## Backend API

- `GET /api/health`
- `GET /api/schema`
- `POST /api/analyze`
- `GET /api/reports/{report_id}`

`POST /api/analyze` supports:

- multipart file upload
- remote file URL
- report type: `weekly` or `overall`
- Excel sheet index
- manual column mappings
- custom outcome mappings

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

```bash
cd mobile
npm install
npm run android
```

Inside the app you set:

- backend URL
- report type
- optional sheet index
- optional manual column mappings

The production app now expects an HTTPS backend URL, for example:

```text
https://your-backend.koyeb.app
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

1. Push the `android-cloud-app` branch to GitHub.
2. Create a Koyeb account.
3. Create a new app from your GitHub repo.
4. Choose Docker deployment.
5. Point Koyeb to [Dockerfile.backend](/home/ys/repos/Tj_analyser/Dockerfile.backend).
6. Set the service port to `8000` if Koyeb does not auto-detect it.
7. Add environment variables from [.env.example](/home/ys/repos/Tj_analyser/.env.example).
8. Deploy.
9. Copy the generated HTTPS URL, which should look like `https://your-app-org-hash.koyeb.app`.
10. Put that URL into the Android app backend field.

## Production Deployment Checklist

- backend deploys successfully and `GET /api/health` returns `{"status":"ok"}`
- backend public URL is HTTPS, not HTTP
- Android app backend field uses the HTTPS Koyeb URL
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

Python code can be checked with:

```bash
python -m compileall helpers backend config.py
```
