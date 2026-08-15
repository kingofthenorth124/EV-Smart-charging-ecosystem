import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../types/auth.types';

export const ROLES_KEY = 'roles';

/**
 * Declares the roles required to access a route or controller.
 * Must be combined with JwtAuthGuard (global) and RolesGuard (global).
 *
 * Usage:
 * ```typescript
 * @Roles('SUPER_ADMIN', 'ADMIN_OFFICER')
 * @Get('users')
 * listUsers() { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
