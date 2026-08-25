import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "../types/auth.types";

/**
 * Parameter decorator that extracts the current authenticated user from the request.
 *
 * Usage:
 * ```typescript
 * // Get full payload
 * @Get('me')
 * getMe(@CurrentUser() user: JwtPayload) { ... }
 *
 * // Get a specific field
 * @Post('logout')
 * logout(@CurrentUser('sub') userId: string) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
