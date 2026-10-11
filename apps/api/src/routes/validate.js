import { Router } from "express";
import { promises as dns } from "node:dns";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
export const validateRouter = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
validateRouter.post("/email", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!emailPattern.test(email))
        return res.json({ email, status: "invalid", message: "Invalid email format." });
    const domain = email.split("@").pop();
    try {
        const mx = await dns.resolveMx(domain);
        if (!mx.length)
            return res.json({ email, status: "invalid", message: "This domain has no MX mail server." });
        return res.json({ email, status: "valid", message: "Valid format and mail domain detected.", mx: mx.sort((a, b) => a.priority - b.priority).map(x => x.exchange) });
    }
    catch {
        return res.json({ email, status: "invalid", message: "The email domain could not be verified for mail delivery." });
    }
});
validateRouter.post("/phone", async (req, res) => {
    const raw = String(req.body?.phone || "").trim();
    const defaultCountry = String(req.body?.defaultCountry || "IN").toUpperCase();
    try {
        const valid = isValidPhoneNumber(raw, defaultCountry);
        if (!valid)
            return res.json({ phone: raw, status: "invalid", message: "Invalid phone number or country code." });
        const parsed = parsePhoneNumber(raw, defaultCountry);
        return res.json({ phone: raw, normalized: parsed.number, country: parsed.country, status: "valid", message: "Valid international phone number." });
    }
    catch {
        return res.json({ phone: raw, status: "invalid", message: "Enter an international number, for example +91 9876543210." });
    }
});
