export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(opts: { status: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'code' in err &&
    typeof (err as any).status === 'number' &&
    typeof (err as any).code === 'string'
  );
}

export const apiErrors = {
  badRequest(message: string, details?: unknown) {
    return new ApiError({ status: 400, code: 'BAD_REQUEST', message, details });
  },
  unauthorized(message = 'Unauthorized', details?: unknown) {
    return new ApiError({ status: 401, code: 'UNAUTHORIZED', message, details });
  },
  forbidden(message = 'Forbidden', details?: unknown) {
    return new ApiError({ status: 403, code: 'FORBIDDEN', message, details });
  },
  notFound(message = 'Not found', details?: unknown) {
    return new ApiError({ status: 404, code: 'NOT_FOUND', message, details });
  },
  conflict(message = 'Conflict', details?: unknown) {
    return new ApiError({ status: 409, code: 'CONFLICT', message, details });
  },
  internal(message = 'Internal server error', details?: unknown) {
    return new ApiError({ status: 500, code: 'INTERNAL', message, details });
  },
};

