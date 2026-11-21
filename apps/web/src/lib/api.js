function getApiBase() {
  const configured = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  // The Vite dev server proxies /api to Express. In production, the API is a
  // separate service (for example Render), so never silently send POST requests
  // to the static frontend host; that commonly returns HTTP 405.
  if (import.meta.env.DEV) return "/api";
  return "";
}

const API = getApiBase();

function requireApiBase() {
  if (!API) {
    throw new Error(
      "SIC API is not configured. In Cloudflare Pages production build settings, set VITE_API_URL to your deployed Express API URL ending in /api (for example https://YOUR-API-HOST.onrender.com/api), then rebuild and redeploy. Do not use https://sic-acq.pages.dev/api; Cloudflare Pages is the frontend, not the Express API."
    );
  }
  try {
    const configuredUrl = new URL(API, window.location.origin);
    if (configuredUrl.hostname === "sic-acq.pages.dev" || configuredUrl.hostname.endsWith(".sic-acq.pages.dev")) {
      throw new Error(
        "SIC VITE_API_URL is pointing to a Cloudflare Pages frontend URL. Deploy apps/api to an API host, then set VITE_API_URL to that host ending in /api and redeploy the Pages frontend."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SIC VITE_API_URL")) throw error;
  }
  return API;
}

function explainHttpError(status, fallback) {
  if (status === 405) {
    return "SIC request failed (HTTP 405): the request reached a server that does not accept this API POST route. Set VITE_API_URL to your deployed Express API URL ending in /api (not your Cloudflare Pages website URL), then rebuild and redeploy the frontend.";
  }
  return fallback;
}

async function post(path, body) {
  const apiBase = requireApiBase();
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("SIC API connection failed:", error);
    throw new Error(
      `Cannot connect to the SIC document service (${API}). This commonly means VITE_API_URL points to the Cloudflare Pages frontend instead of the deployed Express API, or the API host is offline. Set VITE_API_URL to your real API host ending in /api, then rebuild and redeploy SIC.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const message = explainHttpError(response.status, data.error || `SIC request failed (HTTP ${response.status}).`);
    throw new Error(message);
  }
  if (!contentType.includes("application/json")) {
    throw new Error("The SIC document service returned an unexpected response. Check that VITE_API_URL points to the API, not the frontend website.");
  }
  return data;
}

export const api = {
  convert: (body) => post("/convert", body),
  share: (body) => post("/share", body),
  validateEmail: (email) => post("/validate/email", { email }),
  validatePhone: (phone) => post("/validate/phone", { phone, defaultCountry: "IN" }),
};

export async function renderPptx(file) {
  const apiBase = requireApiBase();
  let response;
  try {
    response = await fetch(`${apiBase}/render/pptx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "X-SIC-Filename": file?.name || "presentation.pptx",
      },
      body: await file.arrayBuffer(),
    });
  } catch (error) {
    console.error("SIC PPTX renderer connection failed:", error);
    throw new Error(`Cannot connect to the SIC document service (${API}). Confirm VITE_API_URL points to the deployed Express API host ending in /api, not the Cloudflare Pages frontend, then rebuild and redeploy SIC.`);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(explainHttpError(response.status, data.error || `PPTX renderer failed (HTTP ${response.status}).`));
  }
  return response.json();
}
