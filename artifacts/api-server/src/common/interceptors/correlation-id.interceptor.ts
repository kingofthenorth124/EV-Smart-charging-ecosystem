import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Correlation ID Interceptor.
 *
 * Ensures every request has a correlation ID:
 * - Uses the incoming X-Correlation-ID header if present
 * - Generates a UUID v4 if no header is provided
 * - Attaches the ID to request.correlationId (used by exception filter and audit logs)
 * - Echoes the ID back on every response via X-Correlation-ID header
 *
 * This enables end-to-end request tracing across logs, error responses, and audit records.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { correlationId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string | undefined) ?? uuidv4();

    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle().pipe(tap(() => {}));
  }
}
