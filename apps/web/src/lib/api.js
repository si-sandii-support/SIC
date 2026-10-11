const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
async function post(path, body) { const r = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok)
    throw new Error(d.error || "Request failed"); return d; }
export const api = {
    convert: (b) => post("/convert", b),
    share: (b) => post("/share", b),
    validateEmail: (email) => post("/validate/email", { email }),
    validatePhone: (phone) => post("/validate/phone", { phone, defaultCountry: "IN" })
};

export async function renderPptx(file) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  const r = await fetch(`${API}/render/pptx`, {
    method: "POST",
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "X-SIC-Filename": file?.name || "presentation.pptx" },
    body: await file.arrayBuffer(),
  });
  if (!r.ok) throw new Error("PPTX Office renderer unavailable");
  return r.json();
}
