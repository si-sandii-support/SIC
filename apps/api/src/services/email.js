import nodemailer from "nodemailer";
export function isEmailConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

export async function sendEmail(body) {
    const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length)
        throw new Error(`Email provider is not configured. Missing: ${missing.join(", ")}`);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const attachment = body.attachment ? {
        filename: body.attachment.filename,
        content: Buffer.from(body.attachment.base64, "base64"),
        contentType: body.attachment.mimeType
    } : undefined;
    try {
        const mode = ["to", "cc", "bcc"].includes(body.emailRecipientMode) ? body.emailRecipientMode : "to";
        const to = mode === "to" ? body.recipients : (body.senderEmail ? [body.senderEmail] : []);
        const cc = mode === "cc" ? body.recipients : [];
        const bcc = mode === "bcc" ? body.recipients : [];
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            ...(body.senderEmail && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.senderEmail).trim())
                ? { replyTo: String(body.senderEmail).trim() }
                : {}),
            to,
            cc,
            bcc,
            subject: body.subject || "Shared document",
            text: body.message,
            attachments: attachment ? [attachment] : []
        });
        const accepted = (info.accepted || []).map(String);
        const rejected = (info.rejected || []).map(String);
        return body.recipients.map((recipient) => ({
            recipient,
            status: accepted.includes(recipient) ? "accepted" : "failed",
            message: accepted.includes(recipient)
                ? `SMTP server accepted this recipient. This is not a guarantee the mailbox is active.`
                : rejected.includes(recipient) ? "SMTP server rejected this recipient." : "SMTP server did not report acceptance for this recipient."
        }));
    } catch (e) {
        return body.recipients.map((recipient) => ({ recipient, status: "failed", message: e instanceof Error ? e.message : "SMTP delivery failed." }));
    }
}
