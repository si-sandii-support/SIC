
function getApiBase() {
  const configured = String(
    import.meta.env.VITE_API_URL || "/api"
  )
    .trim()
    .replace(/\/+$/, "");

  return configured || "/api";
}

const API = getApiBase();

function requireApiBase() {
  return API;
}

function explainHttpError(status, fallback) {
  if (status === 404) {
    return (
      "SIC API error (404): The API endpoint was not found. " +
      "Check that the Netlify API Function is deployed and " +
      "the /api/* rewrite is configured correctly."
    );
  }

  if (status === 405) {
    return (
      "SIC API error (405): The server does not support this request. " +
      "Check the Express API route and Netlify Function configuration."
    );
  }

  if (status === 413) {
    return "SIC API error (413): The document is too large for the API.";
  }

  return fallback;
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  return null;
}

async function post(path, body) {
  const apiBase = requireApiBase();

  let response;

  try {
    response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("SIC API connection failed:", error);

    throw new Error(
      `Cannot connect to SIC API (${API}). ` +
      "Check your internet connection and API deployment."
    );
  }

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      explainHttpError(
        response.status,
        data?.error || `SIC request failed (HTTP ${response.status}).`
      )
    );
  }

  if (!data) {
    throw new Error(
      "SIC API returned an unexpected response. Expected JSON."
    );
  }

  return data;
}

export const api = {
  convert: (body) => post("/convert", body),

  share: (body) => post("/share", body),

  validateEmail: (email) =>
    post("/validate/email", { email }),

  validatePhone: (phone) =>
    post("/validate/phone", {
      phone,
      defaultCountry: "IN",
    }),
};

export async function renderPptx(file) {
  const apiBase = requireApiBase();

  let response;

  try {
    response = await fetch(`${apiBase}/render/pptx`, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "X-SIC-Filename": file?.name || "presentation.pptx",
      },
      body: await file.arrayBuffer(),
    });
  } catch (error) {
    console.error("SIC PPTX renderer connection failed:", error);

    throw new Error(
      `Cannot connect to SIC API (${API}). Check the API deployment.`
    );
  }

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      explainHttpError(
        response.status,
        data?.error || `PPTX rendering failed (HTTP ${response.status}).`
      )
    );
  }

  if (!data) {
    throw new Error("SIC PPTX renderer returned an invalid response.");
  }

  return data;
}
