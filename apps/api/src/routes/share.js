import { Router } from "express";
import { sendEmail, isEmailConfigured } from "../services/email.js";
import { sendWhatsApp, isWhatsAppConfigured } from "../services/whatsapp.js";

export const shareRouter = Router();

shareRouter.get("/capabilities", (_req, res) => {
  res.json({
    email: { configured: isEmailConfigured() },
    whatsapp: { configured: isWhatsAppConfigured() },
  });
});

shareRouter.post("/", async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.recipients?.length || !b.message?.trim())
      return res.status(400).json({ error: "Recipients and message are required." });

    if (b.channel === "whatsapp" && b.whatsappPhoneNumberId && !/^\d{5,30}$/.test(String(b.whatsappPhoneNumberId).trim())) {
      return res.status(400).json({ error: "WhatsApp Business Phone Number ID must be numeric. Enter the ID from Meta WhatsApp API setup, not a recipient phone number." });
    }

    const configured = b.channel === "email"
      ? isEmailConfigured()
      : b.channel === "whatsapp"
        ? isWhatsAppConfigured(b.whatsappPhoneNumberId)
        : false;

    if (!configured) {
      return res.json({
        ok: false,
        channel: b.channel,
        mode: "browser",
        providerConfigured: false,
        recipients: b.channel === "email"
          ? {
              to: b.emailRecipientMode === "to" ? b.recipients : [],
              cc: b.emailRecipientMode === "cc" ? b.recipients : [],
              bcc: b.emailRecipientMode === "bcc" ? b.recipients : [],
            }
          : undefined,
        results: b.recipients.map((recipient) => ({
          recipient,
          status: "browser",
          message: b.channel === "email"
            ? "Email provider is not configured. Opening your default email application instead."
            : "WhatsApp Cloud API is not configured. Opening WhatsApp instead."
        }))
      });
    }

    const results = b.channel === "email"
      ? await sendEmail(b)
      : b.channel === "whatsapp"
        ? await sendWhatsApp(b)
        : null;

    if (!results) return res.status(400).json({ error: "Unsupported sharing channel." });
    res.json({ ok: results.some(x => x.status === "accepted"), channel: b.channel, mode: "api", providerConfigured: true, results });
  } catch (e) {
    next(e);
  }
});
