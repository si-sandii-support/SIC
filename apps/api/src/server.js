import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { convertRouter } from "./routes/convert.js";
import { shareRouter } from "./routes/share.js";
import { validateRouter } from "./routes/validate.js";
import { renderRouter } from "./routes/render.js";

const app = express();
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
app.use(cors({
  // origin(origin, callback) {
  //   // Allow server-to-server/health checks with no Origin header. Browser origins must be allowlisted.
  //   if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  //   return callback(new Error("Origin is not allowed by CORS."));
  // },
  origin: [
    "https://sic-net.netlify.app/",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", 'PUT', 'DELETE', 'PATCH', "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
