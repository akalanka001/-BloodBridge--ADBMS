export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(404, message, details);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Invalid request data', details = null) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', details = null) {
    super(401, message, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Permission denied', details = null) {
    super(403, message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict or duplicate', details = null) {
    super(409, message, details);
  }
}
