import Database from "better-sqlite3";
import { DB_PATH } from "./config";

export type TokenStatus = "pending" | "verified";

export interface TokenRecord {
  token: string;
  status: TokenStatus;
  answer: string;
  ip_address: string | null;
  createdAt: number;
}

const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY, status TEXT NOT NULL, answer TEXT,
  ip_address TEXT, createdAt INTEGER NOT NULL
)`);

const insertStmt = db.prepare(
  `INSERT INTO tokens (token, status, answer, createdAt) VALUES (?, ?, ?, ?)`
);
const getStmt = db.prepare(`SELECT * FROM tokens WHERE token = ?`);
const verifyStmt = db.prepare(
  `UPDATE tokens SET status = ?, ip_address = ? WHERE token = ?`
);
const selectExpiredStmt = db.prepare(
  `SELECT token FROM tokens WHERE createdAt < ?`
);
const deleteExpiredStmt = db.prepare(`DELETE FROM tokens WHERE createdAt < ?`);

export function insertToken(
  token: string,
  answer: string,
  createdAt: number
): void {
  insertStmt.run(token, "pending", answer, createdAt);
}

export function getToken(token: string): TokenRecord | undefined {
  return getStmt.get(token) as TokenRecord | undefined;
}

export function markVerified(token: string, ip: string): void {
  verifyStmt.run("verified", ip, token);
}

export function deleteExpiredTokens(cutoff: number): string[] {
  const expired = selectExpiredStmt.all(cutoff) as { token: string }[];
  deleteExpiredStmt.run(cutoff);
  return expired.map((row) => row.token);
}
