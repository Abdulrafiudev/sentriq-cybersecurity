export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "error", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "bad_request", details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message, "unauthorized");
  }
  static forbidden(message = "Not permitted") {
    return new ApiError(403, message, "forbidden");
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message, "not_found");
  }
  static internal(message = "Something went wrong", details?: unknown) {
    return new ApiError(500, message, "internal_error", details);
  }
}
