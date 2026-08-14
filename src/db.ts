import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DB_PATH, SQL_DIR } from "./config";

export type TokenStatus = "pending" | "verified";

export interface TokenRecord {
  token: string;
  status: TokenStatus;
  answer: string;
  ip_address: string | null;
  createdAt: number;
}

function loadSql(fileName: string): string {
  return fs.readFileSync(path.join(SQL_DIR, fileName), "utf-8");
}

const db = new Database(DB_PATH);

db.exec(loadSql("create-tokens-table.sql"));

const insertStmt = db.prepare(loadSql("insert-token.sql"));
const getStmt = db.prepare(loadSql("get-token.sql"));
const verifyStmt = db.prepare(loadSql("verify-token.sql"));
const selectExpiredStmt = db.prepare(loadSql("select-expired-tokens.sql"));
const deleteExpiredStmt = db.prepare(loadSql("delete-expired-tokens.sql"));

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
