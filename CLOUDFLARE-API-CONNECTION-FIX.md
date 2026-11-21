# Fix: Cannot connect to the SIC document service

The error showing `https://sic-acq.pages.dev/api` means the frontend is still sending API requests to the Cloudflare Pages website. Pages hosts the static frontend; it does not automatically run the Express API. Changing `.env.example` alone does not change the deployed site.

## 1. Deploy the API service

Deploy the repository's `apps/api` service to an API host that supports the included Dockerfile (the project includes `render.yaml` for Render). Wait until the service is live and copy its real service URL, for example `https://YOUR-REAL-API-HOST.onrender.com`.

In the API host's environment settings, set:

- `NODE_ENV=production`
- `CORS_ORIGIN=https://sic-acq.pages.dev` (no trailing slash and no `/api`)
- `TRUST_PROXY=true`
- `MAX_BODY_MB=50`

The hosting platform should provide `PORT` automatically. Do not set `CORS_ORIGIN` to the API URL; it must be the browser-visible frontend origin. If using a custom frontend domain, include that exact origin too, comma-separated.

## 2. Verify the API before rebuilding the frontend

Open this in a browser, replacing the hostname with the real API service URL:

`https://YOUR-REAL-API-HOST.onrender.com/health`

It should return HTTP 200 and JSON similar to `{"ok":true,"service":"sic-document-api"}`. If it does not, the API is not deployed or healthy yet; fix that on the API host first.

## 3. Correct Cloudflare Pages build settings

Open Cloudflare Dashboard → Workers & Pages → your `sic-acq` Pages project → Settings → Build and deployments → Environment variables. For the **Production** environment, set:

`VITE_API_URL=https://YOUR-REAL-API-HOST.onrender.com/api`

Replace the example hostname with the exact API service URL you copied. Do not use `https://sic-acq.pages.dev/api`, `localhost`, or a made-up hostname.

Save and trigger a new deployment (Retry deployment / deploy latest commit). `VITE_API_URL` is embedded in the frontend at build time; merely saving the variable without rebuilding will leave the old URL in the live bundle. If using Preview deployments, configure the Preview variable separately as well.

## 4. Verify in the browser

After the Pages deployment finishes, reload `https://sic-acq.pages.dev` with a hard refresh. Open Developer Tools → Network, click Generate File, and inspect the request URL. It must start with your API host and end with a route such as `/api/convert`, not `sic-acq.pages.dev/api/convert`.

- `Failed to fetch` / connection error: API host is unreachable, asleep, unhealthy, or the URL is wrong.
- CORS error: ensure the API's `CORS_ORIGIN` exactly matches `https://sic-acq.pages.dev` (origin only; no path or trailing slash), then redeploy the API.
- HTTP 404: check that the API URL ends with `/api` and that the requested route exists.
- HTTP 405: the request is still reaching the wrong host or an unsupported route; inspect the actual Network request URL.
- HTTP 5xx: inspect the API host's logs for the conversion failure.

## 5. Local development

For local work, use the root `.env.example` as a template for `.env` and keep `VITE_API_URL` empty. Vite proxies `/api` to `http://localhost:4000`; start both the web app and Express API. Local `CORS_ORIGIN` should be `http://localhost:5173`.

Do not put SMTP passwords or WhatsApp access tokens in `VITE_*` variables or frontend code.


## Vite proxy: local development only

`apps/web/vite.config.js` proxies `/api` and `/health` to `SIC_DEV_API_PROXY_TARGET`. By default this is `http://localhost:4000`, which is correct when the Express API is running locally on port 4000. If your API is running on another host during local development, set `SIC_DEV_API_PROXY_TARGET` in the monorepo-root `.env` to that API origin (origin only, without `/api`), for example `https://your-api-host.example.com`. Restart Vite after changing it.

**Important:** Vite's proxy is only for the development server. It does not configure Cloudflare Pages production requests. For the deployed site, set the Cloudflare Pages build environment variable `VITE_API_URL` to the real API base URL ending in `/api`, then trigger a fresh production build/deployment. Do not set `VITE_API_URL` to the Pages frontend domain unless the API actually runs there.


## CORS preflight error on Cloudflare Pages preview deployments

If the browser console says a preflight to `https://sic-acq.pages.dev/api/validate/email` failed, the request is still going to the Pages frontend rather than the Express API. CORS settings alone cannot make Pages serve Express routes. Deploy `apps/api` to a separate API host, then set the Cloudflare Pages **production** build variable `VITE_API_URL` to `https://YOUR-REAL-API-HOST/api` and redeploy. Use the actual host from your API provider.

The API CORS middleware also permits the project's canonical Pages origin and preview origins matching `https://<deployment-hash>.sic-acq.pages.dev`; other origins must be explicitly listed in `CORS_ORIGIN`. This allows preview builds to call the API without opening CORS to every website.

After redeploying, verify `https://YOUR-REAL-API-HOST/health` returns `200` JSON and inspect the browser Network tab: the request URL for validation should begin with your API host, not `sic-acq.pages.dev`.


## CORS headers snippet: use the right runtime

The `new Response(...)` / `function corsHeaders(...)` snippet is for a Cloudflare Pages Function or another Fetch API handler. This project currently runs its API with Express in `apps/api/src/server.js`, so do **not** paste a `new Response` return into the Express route. The Express `cors()` middleware already handles `OPTIONS` preflight and returns the CORS headers. It permits the canonical SIC Pages origin and this project's `*.sic-acq.pages.dev` preview origins, and allows `Content-Type`, `Authorization`, and `X-SIC-Filename`.

If you intentionally move an endpoint into a Cloudflare Pages Function, use an explicit origin allowlist rather than blindly reflecting any incoming origin. Example for that Pages Function only:

```js
const ALLOWED_ORIGINS = new Set([
  "https://sic-acq.pages.dev",
  "http://localhost:5173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const isSicPreview = /^https:\/\/[a-z0-9-]+\.sic-acq\.pages\.dev$/i.test(origin);
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) || isSicPreview ? origin : "https://sic-acq.pages.dev";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-SIC-Filename",
    "Access-Control-Max-Age": "600",
  };
}

export async function onRequest(context) {
  const headers = corsHeaders(context.request);
  if (context.request.method === "OPTIONS") {
    const origin = context.request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.sic-acq\.pages\.dev$/i.test(origin);
    if (!allowed) return new Response("Origin not allowed", { status: 403, headers });
    return new Response(null, { status: 204, headers });
  }
  // Continue with the function's actual endpoint logic here.
  return new Response(JSON.stringify({ error: "Endpoint logic not implemented" }), {
    status: 501,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
```

This sample is not a substitute for deploying the existing Express API: a Pages Function would need its own implementation for each endpoint. The current console error shows the browser still requests `https://sic-acq.pages.dev/api/validate/email`; change the Cloudflare Pages build variable `VITE_API_URL` to the real deployed Express API URL ending in `/api`, then rebuild/redeploy Pages. CORS headers cannot make the static Pages frontend serve Express routes.
