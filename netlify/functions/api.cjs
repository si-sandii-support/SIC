
"use strict";

// Static CommonJS import allows Netlify to detect the dependency.
const serverlessModule = require("serverless-http");
const serverless =
  serverlessModule.default || serverlessModule;

let handlerPromise = null;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = import(
      "../../apps/backend/src/app.js"
    )
      .then((appModule) => {
        const app = appModule.default || appModule.app;

        if (typeof app !== "function") {
          throw new Error(
            "SIC Express application export is missing."
          );
        }

        return serverless(app);
      })
      .catch((error) => {
        handlerPromise = null;
        console.error("SIC initialization failed:", error);
        throw error;
      });
  }

  return handlerPromise;
}

exports.handler = async (event, context) => {
  try {
    const handler = await getHandler();
    return await handler(event, context);
  } catch (error) {
    console.error("SIC API initialization failed:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "SIC API initialization failed.",
      }),
    };
  }
};
