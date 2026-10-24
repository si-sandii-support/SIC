// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import rateLimit from "express-rate-limit";
// import serverless from "serverless-http";

// import { convertRouter } from "../../apps/api/src/routes/convert.js";
// import { shareRouter } from "../../apps/api/src/routes/share.js";
// import { validateRouter } from "../../apps/api/src/routes/validate.js";
// import { renderRouter } from "../../apps/api/src/routes/render.js";

// const app = express();

// app.use(helmet());

// app.use(
//   cors({
//     origin: [
//       "https://sic-net.netlify.app",
//       "http://localhost:5173",
//     ],
//   })
// );

// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     limit: 100,
//   })
// );

// // These routers must define the expected routes, including POST /convert.
// // app.use("/api", convertRouter);
// // app.use("/api", shareRouter);
// // app.use("/api", validateRouter);
// // app.use("/api", renderRouter);

// app.use("/api/convert", convertRouter);
// app.use("/api/share", shareRouter);
// app.use("/api/validate", validateRouter);
// app.use("/api/render", renderRouter);

// app.get(["/health", "/api/health"], (_req, res) => {
//   res.status(200).json({
//     ok: true,
//     service: "sic-document-api",
//   });
// });

// export const handler = serverless(app);








// ///////////////////////////////////////     code of fix          /////////////////////////////////////////////////////////

// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import rateLimit from "express-rate-limit";
// import serverless from "serverless-http";

// import { convertRouter } from "./routes/convert.js";
// import { shareRouter } from "./routes/share.js";
// import { validateRouter } from "./routes/validate.js";
// import { renderRouter } from "./routes/render.js";

// const app = express();

// const isProduction = process.env.NODE_ENV === "production";
// const maxBodyMb = Math.min(
//   Math.max(Number(process.env.MAX_BODY_MB || 50), 1),
//   100
// );

// const allowedOrigins = (
//   process.env.CORS_ORIGIN ||
//   (isProduction
//     ? "https://sic-net.netlify.app"
//     : "http://localhost:5173")
// )
//   .split(",")
//   .map((origin) => origin.trim().replace(/\/+$/, ""))
//   .filter(Boolean);

// if (
//   isProduction &&
//   (!allowedOrigins.length || allowedOrigins.includes("*"))
// ) {
//   throw new Error(
//     "Production requires exact CORS_ORIGIN values."
//   );
// }

// if (process.env.TRUST_PROXY === "true") {
//   app.set("trust proxy", 1);
// }

// app.disable("x-powered-by");

// // CORS must run before routes and rate limits.
// app.use(
//   cors({
//     origin(origin, callback) {
//       if (
//         !origin ||
//         allowedOrigins.includes(origin.replace(/\/+$/, ""))
//       ) {
//         return callback(null, true);
//       }

//       return callback(
//         new Error("Origin is not allowed by CORS.")
//       );
//     },
//     methods: [
//       "GET",
//       "POST",
//       "PUT",
//       "PATCH",
//       "DELETE",
//       "OPTIONS",
//     ],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     maxAge: 600,
//   })
// );

// app.use(helmet());

// app.use(
//   express.raw({
//     type: [
//       "application/octet-stream",
//       "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//     ],
//     limit: `${maxBodyMb}mb`,
//   })
// );

// app.use(express.json({ limit: `${maxBodyMb}mb` }));

// const makeLimiter = (envName, fallback) =>
//   rateLimit({
//     windowMs: 60_000,
//     limit: Number(process.env[envName] || fallback),
//     standardHeaders: "draft-8",
//     legacyHeaders: false,
//   });

// app.use(makeLimiter("GLOBAL_RATE_LIMIT", 120));

// app.get("/health", (_req, res) => {
//   res.status(200).json({
//     ok: true,
//     service: "sic-document-api",
//   });
// });

// app.use(
//   "/api/convert",
//   makeLimiter("CONVERT_RATE_LIMIT", 20),
//   convertRouter
// );

// app.use(
//   "/api/share",
//   makeLimiter("SHARE_RATE_LIMIT", 10),
//   shareRouter
// );

// app.use(
//   "/api/validate",
//   makeLimiter("VALIDATE_RATE_LIMIT", 30),
//   validateRouter
// );

// app.use(
//   "/api/render",
//   makeLimiter("RENDER_RATE_LIMIT", 5),
//   renderRouter
// );

// app.use((err, _req, res, _next) => {
//   if (err?.message === "Origin is not allowed by CORS.") {
//     return res.status(403).json({
//       error: "This website origin is not allowed to access the SIC API.",
//     });
//   }

//   if (err?.type === "entity.too.large") {
//     return res.status(413).json({
//       error: `Request is too large. Maximum request size is ${maxBodyMb} MB.`,
//     });
//   }

//   console.error("SIC API request failed:", err);

//   const status = Number(err?.status || err?.statusCode);
//   const safeStatus =
//     status >= 400 && status < 500 ? status : 500;

//   return res.status(safeStatus).json({
//     error: isProduction
//       ? "The request could not be completed. Please try again."
//       : err instanceof Error
//         ? err.message
//         : "Unexpected server error.",
//   });
// });

// // export default app;
// export const handler = serverless(app);





/////////////////////////////////////////   new code of line with fix /////////////////////////////////////////



import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import serverless from "serverless-http";

import { convertRouter } from "../../apps/api/src/routes/convert.js";
import { shareRouter } from "../../apps/api/src/routes/share.js";
import { validateRouter } from "../../apps/api/src/routes/validate.js";
import { renderRouter } from "../../apps/api/src/routes/render.js";

const app = express();

const maxBodyMb = Math.min(
  Math.max(Number(process.env.MAX_BODY_MB || 4), 1),
  4
);

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "https://sic-net.netlify.app,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin.replace(/\/+$/, ""))
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.use(helmet());
app.use(express.json({ limit: `${maxBodyMb}mb` }));

const limiter = (name, fallback) =>
  rateLimit({
    windowMs: 60_000,
    limit: Number(process.env[name] || fallback),
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

app.use(limiter("GLOBAL_RATE_LIMIT", 120));

app.get(
  ["/health", "/api/health", "/.netlify/functions/api/health"],
  (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "sic-document-api",
    });
  }
);

app.use(
  [
    "/api/convert",
    "/convert",
    "/.netlify/functions/api/convert",
  ],
  limiter("CONVERT_RATE_LIMIT", 20),
  convertRouter
);

app.use(
  [
    "/api/share",
    "/share",
    "/.netlify/functions/api/share",
  ],
  limiter("SHARE_RATE_LIMIT", 10),
  shareRouter
);

app.use(
  [
    "/api/validate",
    "/validate",
    "/.netlify/functions/api/validate",
  ],
  limiter("VALIDATE_RATE_LIMIT", 30),
  validateRouter
);

app.use(
  [
    "/api/render",
    "/render",
    "/.netlify/functions/api/render",
  ],
  limiter("RENDER_RATE_LIMIT", 5),
  renderRouter
);

app.use((err, _req, res, _next) => {
  if (err?.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      error: "This website origin is not allowed to access the SIC API.",
    });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request is too large for the configured SIC API limit.",
    });
  }

  console.error("SIC API request failed:", err);

  return res.status(500).json({
    error: "The SIC API request failed. Check the function logs.",
  });
});

export const handler = serverless(app);

