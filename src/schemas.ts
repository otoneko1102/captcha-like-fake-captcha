import { z } from "zod";

export const verifySchema = z.object({
  token: z.string().uuid({ version: "v4" }),
  answer: z.string(),
});

export const checkTokenSchema = z.object({
  token: z.string().uuid(),
});
