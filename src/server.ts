/**
 * 偽ReCAPTCHA風Captchaの配信用のサンプル
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import svgCaptcha from "svg-captcha";
import sharp from "sharp";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_TIMEOUT: number = 1000 * 60 * 5; // 5m
const TOKEN_LIFETIME: number = 1000 * 60 * 10; // 10m
const CLEANUP_INTERVAL: number = 1000 * 60; // 1m

// DBのレコードの型
interface TokenRecord {
  token: string;
  status: "pending" | "verified";
  answer: string;
  ip_address: string | null;
  createdAt: number;
}

// Zodスキーマ
const verifySchema = z.object({
  token: z.string().uuid({ version: "v4" }),
  answer: z.string(),
});

const checkTokenSchema = z.object({
  token: z.string().uuid(),
});

// IP
app.set("trust proxy", 1);

// レートリミット
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 1000, // 1000 access/IP
  standardHeaders: true,
  legacyHeaders: false,
});

function setup(): void {
  const libDir: string = "./lib";
  const captchaDir: string = "./public/img/captcha";
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
  }
  if (!fs.existsSync(captchaDir)) {
    fs.mkdirSync(captchaDir, { recursive: true });
  }
}

setup();

// データベース

const db: sqlite3.Database = new sqlite3.Database("./lib/tokens.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

db.run(`CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY, status TEXT NOT NULL, answer TEXT,
  ip_address TEXT, createdAt INTEGER NOT NULL
)`);

// ---

function cleanupTokens(): void {
  const cutoff = Date.now() - TOKEN_LIFETIME;
  const captchaDir = "./public/img/captcha";

  db.all(
    `SELECT token FROM tokens WHERE createdAt < ?`,
    [cutoff],
    (err, rows) => {
      if (err) return;
      (rows as { token: string }[]).forEach((row) => {
        const filePath: string = path.join(captchaDir, `${row.token}.png`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  );

  db.run(`DELETE FROM tokens WHERE createdAt < ?`, [cutoff], function (err) {
    if (err) {
      console.error("Cleanup Error:", err.message);
    } else if (this.changes > 0) {
      console.log(`Cleanup: Deleted ${this.changes} expired token(s).`);
    }
  });
}

cleanupTokens();
setInterval(cleanupTokens, CLEANUP_INTERVAL);

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(limiter);

app.get("/generate-token", async (req: Request, res: Response) => {
  const token: string = uuidv4();
  const createdAt: number = Date.now();

  const captcha: svgCaptcha.CaptchaObj = svgCaptcha.create({
    size: 6, // 文字数
    ignoreChars: "0Oo1IiLl", // 除外文字
    noise: 12, // 線
    background: "#f0f0f0",
  });

  const answer: string = captcha.text;
  const svgData: string = captcha.data;
  const filePath: string = path.join(
    __dirname,
    "..",
    "public/img/captcha",
    `${token}.png`
  );

  try {
    await sharp(Buffer.from(svgData)).png().toFile(filePath);
  } catch (error) {
    console.error("Image conversion failed:", error);
    return res
      .status(500)
      .json({ success: false, error: "Image generation failed" });
  }

  db.run(
    `INSERT INTO tokens (token, status, answer, createdAt) VALUES (?, ?, ?, ?)`,
    [token, "pending", answer, createdAt],
    (err) => {
      if (err)
        return res.status(500).json({ success: false, error: "DB Error" });
      res.json({ success: true, token });
    }
  );
});

app.get("/hta/captcha.hta", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/hta"); // HTML Application
  res.sendFile(path.join(__dirname, "..", "hta", "captcha.hta"));
});

app.post("/verify", (req: Request, res: Response) => {
  try {
    const { token, answer } = verifySchema.parse(req.body);
    const ip: string | undefined = req.ip;

    db.get(
      `SELECT * FROM tokens WHERE token = ?`,
      [token],
      (err, row: TokenRecord) => {
        if (
          err ||
          !row ||
          Date.now() - row.createdAt > TOKEN_TIMEOUT ||
          row.status !== "pending" ||
          row.answer?.toLowerCase() !== answer?.toLowerCase()
        ) {
          return res
            .status(400)
            .json({ success: false, message: "Auth Failed" });
        }

        db.run(
          `UPDATE tokens SET status = ?, ip_address = ? WHERE token = ?`,
          ["verified", ip, token],
          (updateErr) => {
            if (updateErr)
              return res
                .status(500)
                .json({ success: false, message: "DB Error" });

            const filePath: string = path.join(
              __dirname,
              "..",
              "public/img/captcha",
              `${token}.png`
            );
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            res.json({ success: true, message: "Auth Success" });
          }
        );
      }
    );
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }
});

app.post("/check-token", (req: Request, res: Response) => {
  try {
    const { token } = checkTokenSchema.parse(req.body);
    const currentIp: string | undefined = req.ip;

    db.get(
      `SELECT * FROM tokens WHERE token = ?`,
      [token],
      (err, row: TokenRecord) => {
        if (err || !row) return res.status(401).json({ success: false });

        if (row.status === "verified" && row.ip_address === currentIp) {
          const expiresAt: number = row.createdAt + TOKEN_LIFETIME;
          res.json({ success: true, expiresAt: expiresAt });
        } else {
          res.status(401).json({ success: false });
        }
      }
    );
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }
});

app.get("/", (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
);
app.get("/protected", (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, "..", "public", "protected.html"))
);

app.listen(PORT, () =>
  console.log(`Server is running on http://localhost:${PORT}`)
);
