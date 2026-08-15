import { SetMetadata } from '@nestjs/common';

/** Key used by JwtAuthGuard to check if a route is public */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as publicly accessible.
 * Routes decorated with @Public() bypass JWT authentication.
 *
 * Usage:
 * ```typescript
 * @Public()
 * @Get('healthz')
 * healthCheck() { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
