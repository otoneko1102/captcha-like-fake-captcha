import fs from "fs";
import path from "path";
import { CAPTCHA_DIR, TOKEN_LIFETIME } from "./config";
import { deleteExpiredTokens } from "./db";

export function cleanupExpiredTokens(): void {
  const cutoff = Date.now() - TOKEN_LIFETIME;
  const expiredTokens = deleteExpiredTokens(cutoff);

  for (const token of expiredTokens) {
    const filePath = path.join(CAPTCHA_DIR, `${token}.png`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  if (expiredTokens.length > 0) {
    console.log(`Cleanup: Deleted ${expiredTokens.length} expired token(s).`);
  }
}
