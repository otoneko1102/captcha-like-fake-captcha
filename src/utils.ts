import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

// Express の "trust proxy": 1 相当。単一のリバースプロキシ配下のデプロイを前提とし、
// x-forwarded-for の先頭要素をクライアントIPとして扱う。
export function getClientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]!.trim();
  }
  return getConnInfo(c).remote.address ?? "unknown";
}
