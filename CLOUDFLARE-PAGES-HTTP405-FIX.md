# SIC: fix HTTP 405 when the frontend is on Cloudflare Pages

## Root cause

This repository is a monorepo with a React/Vite frontend in `apps/web` and a separate Express API in `apps/api`. Cloudflare Pages hosting the static frontend does **not** start `apps/api/src/server.js`. Setting `VITE_API_URL=https://sic-acq.pages.dev/api` sends POST requests to the frontend host, where there is no Express conversion route, so HTTP 405/404 can result.

## Recommended fix (keep the current Express code)

1. Deploy the repository's Express API as a separate web service. For example, on Render create a Web Service from this repository, use the repository root as the build context, and set the Dockerfile path to `apps/api/Dockerfile`. The repository Dockerfile expects the root workspace/package files to be available in the build context.
2. Add API environment variables on the API service:

   ```env
   NODE_ENV=production
   CORS_ORIGIN=https://sic-acq.pages.dev
   TRUST_PROXY=true
   MAX_BODY_MB=50
   ```

   Keep `PORT` assigned by the host (the Express app already reads `process.env.PORT`). Add SMTP/WhatsApp credentials only if you need server-side sending; never add secrets to `VITE_*` variables.
3. Wait for deployment, then open `https://YOUR-API-HOST/health`. It must return HTTP 200 JSON similar to `{"ok":true,"service":"sic-document-api"}`.
4. In Cloudflare Pages → Settings → Environment variables, set this **build** variable to your actual API service URL:

   ```env
   VITE_API_URL=https://YOUR-API-HOST/api
   ```

   Do not use `https://sic-acq.pages.dev/api` unless you have separately implemented Cloudflare Pages Functions at those API paths.
5. Trigger a new Pages deployment so Vite rebuilds with the new variable. Vite variables are embedded into the generated browser bundle at build time.
6. Test `POST https://YOUR-API-HOST/api/convert` through the SIC Generate button. The endpoint expects JSON with a non-empty `blocks` array and a supported `format` (`pdf`, `docx`, `pptx`, or `xlsx`).

## Local development

Copy `.env.example` to `.env`. Keep `VITE_API_URL=http://localhost:4000/api` and `CORS_ORIGIN=http://localhost:5173`, then run `npm install` and `npm run dev` from the repository root.

## Pages-only alternative

If you must host everything on Cloudflare Pages and nowhere else, the Express API must be ported to Cloudflare Pages Functions under `functions/api/...`, and its PDF/DOCX/PPTX/XLSX dependencies plus the PPTX LibreOffice renderer must be adapted for the Workers runtime. Simply changing `VITE_API_URL` or CORS settings cannot make the Express server run on Pages. In particular, the current PPTX visual-render route invokes `libreoffice` and `pdftoppm`, which are OS binaries and cannot run inside a standard Pages Function. Use the separate Express API approach for the least disruptive fix.
