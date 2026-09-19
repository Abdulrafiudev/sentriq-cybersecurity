import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../config/env";
import { login } from "../services/auth.service";
import { ApiError } from "../utils/ApiError";

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await login(email, password);
  res.json({ data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json({ data: req.user });
});

/** Lets the sign-in screen know whether auth is even switched on. */
export const config = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    data: {
      authEnabled: env.authEnabled,
      demoEmail: env.isProd ? null : env.adminEmail,
      demoPassword: env.isProd ? null : env.adminPassword,
    },
  });
});
