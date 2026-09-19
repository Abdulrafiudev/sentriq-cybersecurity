import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies the error handler by arity, so `next` must stay.
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "validation_error", message: "Request validation failed", details: error.issues },
    });
    return;
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) logger.error(error.message, error.details);
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: { code: "validation_error", message: error.message },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  logger.error(`Unhandled error: ${message}`, error);

  res.status(500).json({
    error: {
      code: "internal_error",
      message: env.isProd ? "Something went wrong" : message,
    },
  });
}
