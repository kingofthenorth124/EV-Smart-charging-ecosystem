import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { JwtPayload, UserRole } from "../types/auth.types";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * RBAC Roles Guard.
 *
 * Applied globally via APP_GUARD in AppModule (runs after JwtAuthGuard).
 * Enforces the @Roles() decorator on controllers and handlers.
 *
 * If no @Roles() is declared, the route is accessible to any authenticated user.
 * The backend is always the authoritative enforcement point.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Access denied");
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
