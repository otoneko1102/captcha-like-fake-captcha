import fs from "fs";
import path from "path";

export const ROOT_DIR: string = path.resolve(__dirname, "..");

export const PORT: number = Number(process.env.PORT) || 3000;
export const TOKEN_TIMEOUT: number = 1000 * 60 * 5; // 5m
export const TOKEN_LIFETIME: number = 1000 * 60 * 10; // 10m
export const CLEANUP_INTERVAL: number = 1000 * 60; // 1m

export const PUBLIC_DIR: string = path.join(ROOT_DIR, "public");
export const CAPTCHA_DIR: string = path.join(PUBLIC_DIR, "img", "captcha");
export const LIB_DIR: string = path.join(ROOT_DIR, "lib");
export const DB_PATH: string = path.join(LIB_DIR, "tokens.db");
export const HTA_PATH: string = path.join(ROOT_DIR, "hta", "captcha.hta");

fs.mkdirSync(LIB_DIR, { recursive: true });
fs.mkdirSync(CAPTCHA_DIR, { recursive: true });
