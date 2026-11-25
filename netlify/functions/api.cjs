
"use strict";

let handlerPromise;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = Promise.all([
      import("serverless-http"),
      import("../../apps/backend/src/app.js"),
    ])
      .then(([serverlessModule, appModule]) => {
        const serverless =
          serverlessModule.default || serverlessModule;

        const app =
          appModule.default || appModule.app;

        if (typeof serverless !== "function") {
          throw new Error(
            "SIC: serverless-http failed to load."
          );
        }

        if (!app) {
          throw new Error(
            "SIC: Express application export was not found."
          );
        }

        return serverless(app);
      })
      .catch((error) => {
        handlerPromise = null;
        console.error("SIC Function initialization failed:", error);
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
    console.error("SIC Netlify API error:", error);

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
