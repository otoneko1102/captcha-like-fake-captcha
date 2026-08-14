/**
 * 偽ReCAPTCHA風Captchaの配信用のサンプル
 */

import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";
import { CLEANUP_INTERVAL, PORT } from "./config";
import { cleanupExpiredTokens } from "./cleanup";

cleanupExpiredTokens();
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
