import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasPermission, type Permission } from "@workspace/auth";
import type { Request } from "express";
import type { JwtPayload } from "../types/auth.types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Access denied");
    }

    const allowed = requiredPermissions.every((permission) =>
      hasPermission(user.role, permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Requires permissions: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
