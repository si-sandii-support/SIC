# SIC production deployment guide

This repository contains a React/Vite frontend and an Express API. Deploy them as two services; the frontend alone is not enough for SMTP email, WhatsApp Cloud API sending, conversion endpoints, or PPTX rendering.

## 1. Before going live

- Use Node.js 22 or newer and a supported npm version.
- Choose a public frontend origin and a separate API service URL.
- Configure the API's `CORS_ORIGIN` to the exact frontend origin, with no trailing path. Multiple origins can be comma-separated.
- Keep SMTP passwords and the Meta WhatsApp access token only in the API host's secret environment settings. Never add them to `VITE_*` variables or commit `.env`.
- Use only recipient lists with appropriate permission/opt-in. Follow Meta's approved-template and customer-service-window rules.
- Test upload, extraction, touch selection, export, recipient validation, and fallback sharing with representative PDF/DOCX/PPTX/XLSX files before launch.

## 2. Deploy the API on Render

1. Push this repository to a Git provider.
2. In Render, create a Blueprint from the repository and use `render.yaml`, or create a Docker Web Service with the repository root as Docker context and `apps/api/Dockerfile` as the Dockerfile.
3. Set `CORS_ORIGIN` to the deployed frontend origin, for example `https://your-site.pages.dev`.
4. Add SMTP credentials if you want server-side email delivery. Add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` if you want WhatsApp Cloud API delivery. These are optional; the browser fallback remains available without them.
5. Deploy and check `https://YOUR-API-HOST/health`. It should return `{ "ok": true, "service": "sic-document-api" }`.
6. If the provider supports it, enable automatic deploys and review logs/alerts after the first test send.

## 3. Deploy the frontend on Cloudflare Pages

1. Create a Pages project from the repository.
2. Set the root directory to the repository root.
3. Build command: `npm run build -w apps/web`
4. Build output directory: `apps/web/dist`
5. Set the build environment variable `VITE_API_URL` to `https://YOUR-API-HOST/api` (no trailing slash).
6. Use Node.js 22 in the Pages build environment, then deploy.
7. Add the final Pages domain (and any custom domain) to the API's `CORS_ORIGIN`, separated by commas if needed, then redeploy the API.

`VITE_API_URL` is public client configuration, not a secret. Do not put SMTP passwords or Meta access tokens in any `VITE_*` variable.

## 4. Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell alternative for creating the environment file:

```powershell
Copy-Item .env.example .env
```

Frontend: `http://localhost:5173`  
API health: `http://localhost:4000/health`

## 5. Release checks

- `npm run build` completes without errors.
- `/health` returns HTTP 200 on the deployed API.
- Browser developer tools show no failed API requests or CORS errors.
- Mobile Safari and Android Chrome can upload a file and use Copy to Selected.
- Desktop mouse auto-selection still works.
- PDF, DOCX, PPTX, and XLSX outputs open in their target applications and retain expected content/layout for your test documents.
- Email and WhatsApp tests are sent only to controlled, opted-in test recipients.
- Check provider logs, rate-limit responses, and errors without exposing credentials or document contents.

## 6. Important production limitations

This is a deployment-ready starter, not yet a fully managed multi-user SaaS. Current recipient/file workspace state is browser-local; it is not synchronized across devices and can be lost when browser storage is cleared. The API has CORS restrictions, request-size limits, global and route-level rate limits, and production-safe error responses, but it does not yet provide user login, tenant isolation, persistent document storage, billing, audit logs, or delivery webhooks. Do not expose paid provider sending to an unrestricted public audience until authentication/authorization, abuse controls, and monitoring are added. CORS and rate limiting alone are not authentication.

The PPTX visual renderer additionally needs LibreOffice and `pdftoppm`; the current lightweight API Docker image does not install those optional binaries, so it may use the structured-extraction fallback for slide rendering. Install and test those dependencies in the API image if rendered slide previews are a launch requirement.
