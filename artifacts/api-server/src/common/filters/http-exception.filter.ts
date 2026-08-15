import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error?: string;
  correlationId: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Global exception filter.
 *
 * Transforms all exceptions into the platform error contract:
 * { statusCode, message, error?, correlationId?, details? }
 *
 * Rules:
 * - Never expose stack traces or internal error details to clients
 * - Always include correlationId if present on the request
 * - Validation errors (422) include field-level details
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    // Always produce a correlationId — interceptors run after guards, so
    // guard-thrown errors (401, 403, 429) won't have one on the request yet.
    const correlationId =
      request.correlationId ??
      (request.headers['x-correlation-id'] as string | undefined) ??
      uuidv4();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let details: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = typeof body['message'] === 'string'
          ? body['message']
          : Array.isArray(body['message'])
            ? 'Validation failed'
            : exception.message;
        error = typeof body['error'] === 'string' ? body['error'] : undefined;

        // Handle class-validator ValidationPipe errors (array of messages)
        if (Array.isArray(body['message']) && statusCode === HttpStatus.BAD_REQUEST) {
          statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
          message = 'Validation failed';
          details = this.extractValidationDetails(body['message'] as string[] | ValidationError[]);
        }
      }
    } else if (exception instanceof Error) {
      // Log unexpected errors but don't expose internals
      this.logger.error(
        { err: exception, correlationId, path: request.url, method: request.method },
        'Unhandled exception',
      );
      message = 'An unexpected error occurred';
    } else {
      this.logger.error(
        { exception, correlationId, path: request.url },
        'Non-Error exception thrown',
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      ...(error && { error }),
      correlationId,
      ...(details && { details }),
    };

    // Ensure the X-Correlation-ID header is always present on error responses.
    // The CorrelationIdInterceptor only runs for routed handlers; guard
    // rejections (401/403) and 404s bypass it and land here directly.
    response.setHeader('X-Correlation-ID', correlationId);
    response.status(statusCode).json(body);
  }

  private extractValidationDetails(
    messages: string[] | ValidationError[],
  ): Array<{ field: string; message: string }> {
    if (messages.length === 0) return [];

    // If messages are plain strings (simple format)
    if (typeof messages[0] === 'string') {
      return (messages as string[]).map((msg) => ({
        field: 'unknown',
        message: msg,
      }));
    }

    // If messages are ValidationError objects from class-validator
    return (messages as ValidationError[]).flatMap((ve) =>
      Object.values(ve.constraints ?? {}).map((constraintMsg) => ({
        field: ve.property,
        message: constraintMsg,
      })),
    );
  }
}
