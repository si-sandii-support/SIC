import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { convertRouter } from "./routes/convert.js";
import { shareRouter } from "./routes/share.js";
import { validateRouter } from "./routes/validate.js";
import { renderRouter } from "./routes/render.js";

const app = express();
const compress = compression();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const maxBodyMb = Math.min(Math.max(Number(process.env.MAX_BODY_MB || 50), 1), 100);
const allowedOrigins = (process.env.CORS_ORIGIN || (isProduction ? "" : "http://localhost:5173"))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && (!allowedOrigins.length || allowedOrigins.includes("*"))) {
  throw new Error("Production requires CORS_ORIGIN to contain the exact public frontend origin(s), separated by commas.");
}

// Set TRUST_PROXY=true on platforms such as Render/Fly that terminate TLS at a proxy.
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
const isAllowedFrontendOrigin = (origin) => {
  if (!origin || allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    // Permit Cloudflare Pages preview deployments for this project, e.g.
    // https://<deployment-hash>.sic-acq.pages.dev, without allowing arbitrary domains.
    return url.protocol === "https:" && /^[a-z0-9-]+\.sic-acq\.pages\.dev$/i.test(url.hostname);
  } catch {
    return false;
  }
};

////// //////////////  use compression for limit   ////////////////////
// Response compression: register as Express middleware.
app.use(
  compression({
    threshold: 1024,
    level: 4,
  })
);

app.use(cors({
  origin(origin, callback) {
    // Express cors handles OPTIONS preflight automatically when the origin is allowed.
    if (isAllowedFrontendOrigin(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-SIC-Filename"],
  optionsSuccessStatus: 204,
  maxAge: 600,
}));

app.use(express.raw({ type: ["application/octet-stream", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], limit: `${maxBodyMb}mb` }));
app.use(express.json({ limit: `${maxBodyMb}mb` }));
app.use(rateLimit({ windowMs: 60_000, limit: Number(process.env.GLOBAL_RATE_LIMIT || 120), standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "sic-document-api" }));
app.use("/api/convert", rateLimit({ windowMs: 60_000, limit: Number(process.env.CONVERT_RATE_LIMIT || 20), standardHeaders: "draft-8", legacyHeaders: false }), convertRouter);
app.use("/api/share", rateLimit({ windowMs: 60_000, limit: Number(process.env.SHARE_RATE_LIMIT || 10), standardHeaders: "draft-8", legacyHeaders: false }), shareRouter);
app.use("/api/validate", rateLimit({ windowMs: 60_000, limit: Number(process.env.VALIDATE_RATE_LIMIT || 30), standardHeaders: "draft-8", legacyHeaders: false }), validateRouter);
app.use("/api/render", rateLimit({ windowMs: 60_000, limit: Number(process.env.RENDER_RATE_LIMIT || 5), standardHeaders: "draft-8", legacyHeaders: false }), renderRouter);

app.use((err, _req, res, _next) => {
  if (err?.message === "Origin is not allowed by CORS.") return res.status(403).json({ error: "This website origin is not allowed to access the SIC API." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: `Request is too large. Maximum request size is ${maxBodyMb} MB.` });
  console.error("SIC API request failed:", err);
  const status = Number(err?.status || err?.statusCode);
  const safeStatus = status >= 400 && status < 500 ? status : 500;
  res.status(safeStatus).json({ error: isProduction ? "The request could not be completed. Please try again." : (err instanceof Error ? err.message : "Unexpected server error.") });
});

app.listen(port, "0.0.0.0", () => console.log(`SIC API listening on port ${port} (${process.env.NODE_ENV || "development"})`));
