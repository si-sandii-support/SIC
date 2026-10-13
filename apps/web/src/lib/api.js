function getApiBase() {
  const configured = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  // Local development runs the API on port 4000. In production, prefer a same-origin
  // /api route rather than accidentally sending mobile users to their own localhost.
  if (import.meta.env.DEV) return "http://localhost:4000/api";
  return `${window.location.origin}/api`;
}

const API = getApiBase();

async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("SIC API connection failed:", error);
    throw new Error(
      `Cannot connect to the SIC document service (${API}). Check your internet connection and confirm VITE_API_URL points to the deployed API.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const message = data.error || `SIC request failed (HTTP ${response.status}).`;
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
  const API = getApiBase();
  let response;
  try {
    response = await fetch(`${API}/render/pptx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "X-SIC-Filename": file?.name || "presentation.pptx",
      },
      body: await file.arrayBuffer(),
    });
  } catch (error) {
    console.error("SIC PPTX renderer connection failed:", error);
    throw new Error(`Cannot connect to the SIC document service (${API}). Check VITE_API_URL.`);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `PPTX renderer failed (HTTP ${response.status}).`);
  }
  return response.json();
}
