export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = "bad_request") {
    return new ApiError(400, code, message);
  }

  static unauthorized(message: string, code = "unauthorized") {
    return new ApiError(401, code, message);
  }

  static forbidden(message: string, code = "forbidden") {
    return new ApiError(403, code, message);
  }

  static notFound(message: string, code = "not_found") {
    return new ApiError(404, code, message);
  }

  static conflict(message: string, code = "conflict") {
    return new ApiError(409, code, message);
  }

  static payloadTooLarge(message: string, code = "payload_too_large") {
    return new ApiError(413, code, message);
  }
}
