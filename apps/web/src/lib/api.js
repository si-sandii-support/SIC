const configuredApi = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API = configuredApi || (import.meta.env.DEV ? "http://localhost:4000/api" : "");

function getApiBase() {
  if (!API) {
    throw new Error("SIC API is not configured. Deploy apps/api as an Express service, then set VITE_API_URL to https://YOUR-API-HOST/api in Cloudflare Pages and rebuild.");
  }

  // Cloudflare Pages serves the static frontend; it does not run this repository's
  // Express server automatically. Catch the known incorrect same-origin setup early.
  if (import.meta.env.PROD && typeof window !== "undefined") {
    try {
      const apiUrl = new URL(API, window.location.origin);
      const sameOrigin = apiUrl.origin === window.location.origin;
      const isPagesDomain = window.location.hostname.endsWith(".pages.dev");
      if (sameOrigin && isPagesDomain) {
        throw new Error("VITE_API_URL points to the SIC Cloudflare Pages frontend. The Express API is not running there. Deploy apps/api to an API host and set VITE_API_URL to that service URL ending in /api.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("VITE_API_URL points")) throw error;
      throw new Error("VITE_API_URL is invalid. Set it to your deployed API URL ending in /api.");
    }
  }

  return API;
}

async function post(path, body) {
  const base = getApiBase();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the SIC API. Check that the API service is deployed and VITE_API_URL points to its HTTPS URL.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 405) {
      throw new Error("SIC API returned HTTP 405. VITE_API_URL is likely pointing to the frontend instead of the Express API, or the API route does not allow POST.");
    }
    throw new Error(data.error || `SIC API request failed (HTTP ${response.status}).`);
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
  const base = getApiBase();
  let response;
  try {
    response = await fetch(`${base}/render/pptx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "X-SIC-Filename": file?.name || "presentation.pptx",
      },
      body: await file.arrayBuffer(),
    });
  } catch {
    throw new Error("Cannot reach the SIC API for PowerPoint rendering. Check VITE_API_URL and API deployment.");
  }
  if (!response.ok) {
    if (response.status === 405) {
      throw new Error("SIC API returned HTTP 405 for PowerPoint rendering. VITE_API_URL points to the wrong service or the API route does not allow POST.");
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `PPTX Office renderer unavailable (HTTP ${response.status}).`);
  }
  return response.json();
}
