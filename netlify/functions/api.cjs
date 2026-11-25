
"use strict";

let handlerPromise = null;

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
            "SIC: Failed to load serverless-http."
          );
        }

        if (typeof app !== "function") {
          throw new Error(
            "SIC: Express application export is missing."
          );
        }

        console.log("SIC Express application initialized.");

        return serverless(app);
      })
      .catch((error) => {
        handlerPromise = null;

        console.error(
          "SIC Function initialization failed:",
          error
        );

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
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        success: false,
        error: "SIC API initialization failed.",
      }),
    };
  }
};
