import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { verifyToken, type AuthPayload } from "../services/auth.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("sentriq_token="));
  return cookie ? decodeURIComponent(cookie.slice("sentriq_token=".length)) : null;
}

/** Rejects the request unless a valid JWT is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!env.authEnabled) {
    req.user = { sub: "anonymous", email: "demo@sentriq.io", name: "Demo", role: "lead" };
    next();
    return;
  }

  const token = readToken(req);
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

/** Attaches the user when a token is present, but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      /* ignore — the route does not require it */
    }
  }
  next();
}

export function requireRole(...roles: Array<"analyst" | "lead">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!env.authEnabled) {
      next();
      return;
    }
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden("Your role cannot perform this action"));
      return;
    }
    next();
  };
}
