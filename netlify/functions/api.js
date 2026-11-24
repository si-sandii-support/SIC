import serverless from "serverless-http";
import app from "../../apps/backend/src/server";

export const handler = serverless(app);