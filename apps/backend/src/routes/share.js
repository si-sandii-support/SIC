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
    if (!b || !["email", "whatsapp"].includes(b.channel))
      return res.status(400).json({ error: "Choose a supported sharing channel." });
    if (!Array.isArray(b.recipients) || b.recipients.length < 1 || b.recipients.length > 50)
      return res.status(400).json({ error: "Add between 1 and 50 recipients per send request." });
    if (b.recipients.some((recipient) => typeof recipient !== "string" || !recipient.trim() || recipient.length > 320))
      return res.status(400).json({ error: "One or more recipients are invalid." });
    if (b.channel === "email" && b.recipients.some((recipient) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(recipient.trim())))
      return res.status(400).json({ error: "All email recipients must have a valid email address format." });
    if (b.channel === "whatsapp" && b.recipients.some((recipient) => {
      const digits = recipient.replace(/\D/g, "");
      return digits.length < 8 || digits.length > 15;
    }))
      return res.status(400).json({ error: "All WhatsApp recipients must be valid international phone numbers." });
    if (typeof b.message !== "string" || !b.message.trim() || b.message.length > 10000)
      return res.status(400).json({ error: "A message is required and must be 10,000 characters or fewer." });
    if (b.attachment && (typeof b.attachment.base64 !== "string" || b.attachment.base64.length > 45 * 1024 * 1024))
      return res.status(413).json({ error: "Attachment is missing or too large. Please export a smaller file." });

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
