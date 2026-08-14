import fs from "fs";
import path from "path";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { rateLimiter } from "hono-rate-limiter";
import { zValidator } from "@hono/zod-validator";
import svgCaptcha from "svg-captcha";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { CAPTCHA_DIR, HTA_PATH, TOKEN_LIFETIME, TOKEN_TIMEOUT } from "./config";
import { getToken, insertToken, markVerified } from "./db";
import { checkTokenSchema, verifySchema } from "./schemas";
import { getClientIp } from "./utils";

export const app = new Hono();

app.use(
  rateLimiter({
    windowMs: 60 * 60 * 1000, // 1h
    limit: 1000, // 1000 access/IP
    standardHeaders: "draft-6",
    keyGenerator: (c) => getClientIp(c),
  })
);

app.get("/generate-token", async (c) => {
  const token = uuidv4();
  const createdAt = Date.now();

  const captcha = svgCaptcha.create({
    size: 6, // 文字数
    ignoreChars: "0Oo1IiLl", // 除外文字
    noise: 12, // 線
    background: "#f0f0f0",
  });

  const filePath = path.join(CAPTCHA_DIR, `${token}.png`);

  try {
    await sharp(Buffer.from(captcha.data)).png().toFile(filePath);
  } catch (error) {
    console.error("Image conversion failed:", error);
    return c.json({ success: false, error: "Image generation failed" }, 500);
  }

  insertToken(token, captcha.text, createdAt);
  return c.json({ success: true, token });
});

app.get("/hta/captcha.hta", async (c) => {
  const data = await fs.promises.readFile(HTA_PATH);
  c.header("Content-Type", "application/hta");
  return c.body(new Uint8Array(data));
});

app.post(
  "/verify",
  zValidator("json", verifySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, message: "Invalid input" }, 400);
    }
  }),
  (c) => {
    const { token, answer } = c.req.valid("json");
    const ip = getClientIp(c);

    const row = getToken(token);
    if (
      !row ||
      Date.now() - row.createdAt > TOKEN_TIMEOUT ||
      row.status !== "pending" ||
      row.answer?.toLowerCase() !== answer?.toLowerCase()
    ) {
      return c.json({ success: false, message: "Auth Failed" }, 400);
    }

    markVerified(token, ip);

    const filePath = path.join(CAPTCHA_DIR, `${token}.png`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return c.json({ success: true, message: "Auth Success" });
  }
);

app.post(
  "/check-token",
  zValidator("json", checkTokenSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, message: "Invalid input" }, 400);
    }
  }),
  (c) => {
    const { token } = c.req.valid("json");
    const currentIp = getClientIp(c);

    const row = getToken(token);
    if (!row) return c.json({ success: false }, 401);

    if (row.status === "verified" && row.ip_address === currentIp) {
      return c.json({
        success: true,
        expiresAt: row.createdAt + TOKEN_LIFETIME,
      });
    }

    return c.json({ success: false }, 401);
  }
);

app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/protected", serveStatic({ path: "./public/protected.html" }));
app.use("/*", serveStatic({ root: "./public" }));
