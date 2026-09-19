import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { User, hashPassword, type UserDoc } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

/**
 * Deliberately small (PRD §13): one seeded admin, JWT, protected routes. No roles
 * beyond `analyst` and `lead`, and `lead` exists only to gate the un-redacted
 * original report.
 */

export interface AuthPayload {
  sub: string;
  email: string;
  name: string;
  role: "analyst" | "lead";
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    throw ApiError.unauthorized("Session expired or invalid. Sign in again.");
  }
}

export async function login(email: string, password: string) {
  const user = (await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash",
  )) as UserDoc | null;

  if (!user || !(await user.verifyPassword(password))) {
    // Same message either way so the endpoint does not confirm which emails exist.
    throw ApiError.unauthorized("Incorrect email or password");
  }

  const payload: AuthPayload = {
    sub: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role as "analyst" | "lead",
  };

  return { token: signToken(payload), user: payload };
}

/** Creates the demo admin on first boot so the app is usable straight away. */
export async function ensureAdminUser(): Promise<void> {
  const email = env.adminEmail.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) return;

  await User.create({
    email,
    name: env.adminName,
    role: "lead",
    passwordHash: await hashPassword(env.adminPassword),
  });

  logger.info(`Seeded admin account ${email}`);
  if (!env.isProd) logger.info(`Demo password: ${env.adminPassword}`);
}
