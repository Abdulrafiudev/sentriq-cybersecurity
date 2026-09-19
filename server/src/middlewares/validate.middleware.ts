import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Parses and REPLACES req.body/query/params with the validated, coerced values. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        // Express 5 makes req.query a getter; assign onto a stable field instead.
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.defineProperty(req, "validatedQuery", { value: parsed, configurable: true });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Reads what `validate` stored, falling back to the raw query. */
export function validatedQuery<T>(req: Request): T {
  return ((req as Request & { validatedQuery?: unknown }).validatedQuery ?? req.query) as T;
}
