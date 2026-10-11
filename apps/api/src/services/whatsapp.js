async function graph(path, token, body, headers) {
    const r = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || "v23.0"}/${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...headers }, body });
    const text = await r.text();
    let data = {};
    try {
        data = JSON.parse(text);
    }
    catch { }
    if (!r.ok)
        throw new Error(data?.error?.message || text || "WhatsApp API request failed");
    return data;
}
function resolvePhoneNumberId(value) {
    const candidate = String(value || process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
    return /^\d{5,30}$/.test(candidate) ? candidate : "";
}

export function isWhatsAppConfigured(phoneNumberId) {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && resolvePhoneNumberId(phoneNumberId));
}

export async function sendWhatsApp(b) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phone = resolvePhoneNumberId(b.whatsappPhoneNumberId);
    if (!token || !phone)
        throw new Error("WhatsApp Cloud API needs a valid WhatsApp Business Phone Number ID and server-side WHATSAPP_ACCESS_TOKEN.");
    let mediaId;
    if (b.attachment) {
        const fd = new FormData();
        fd.append("messaging_product", "whatsapp");
        fd.append("file", new Blob([Buffer.from(b.attachment.base64, "base64")], { type: b.attachment.mimeType }), b.attachment.filename);
        const media = await graph(`${phone}/media`, token, fd, {});
        mediaId = media.id;
    }
    return Promise.all(b.recipients.map(async (raw) => {
        const to = raw.replace(/\D/g, "");
        try {
            const payload = mediaId ? {
                messaging_product: "whatsapp", to, type: "document",
                document: { id: mediaId, caption: b.message, filename: b.attachment?.filename }
            } : {
                messaging_product: "whatsapp", to, type: "text", text: { body: b.message }
            };
            const data = await graph(`${phone}/messages`, token, JSON.stringify(payload), { "Content-Type": "application/json" });
            const waId = data?.contacts?.[0]?.wa_id;
            const msgId = data?.messages?.[0]?.id;
            return {
                recipient: raw, status: "accepted",
                message: waId
                    ? `WhatsApp accepted this recipient (wa_id ${waId}). Message ID: ${msgId || "generated"}. Final delivery status should be tracked through your WhatsApp webhook.`
                    : "WhatsApp accepted the message. Final delivery status should be tracked through your WhatsApp webhook."
            };
        }
        catch (e) {
            return { recipient: raw, status: "failed", message: e instanceof Error ? e.message : "WhatsApp rejected this recipient." };
        }
    }));
}
