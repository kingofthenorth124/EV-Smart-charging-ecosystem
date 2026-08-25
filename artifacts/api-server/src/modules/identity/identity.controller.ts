import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { JwtPayload } from "../../common/types/auth.types";
import { IdentityService } from "./identity.service";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@ApiTags("users")
@ApiBearerAuth("BearerAuth")
@Controller("v1/users")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * GET /api/v1/users
   * List users — Admin only
   */
  @Get()
  @Roles("SUPER_ADMIN", "ADMIN_OFFICER")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List users (Admin)" })
  @ApiResponse({ status: 200, description: "Paginated user list" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  listUsers(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.identityService.findAll(query, actor.sub);
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID — Admin only
   */
  @Get(":id")
  @Roles("SUPER_ADMIN", "ADMIN_OFFICER", "SUPPORT")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get user by ID (Admin)" })
  @ApiResponse({ status: 200, description: "User profile" })
  @ApiResponse({ status: 404, description: "User not found" })
  getUserById(@Param("id") id: string) {
    return this.identityService.findById(id);
  }

  /**
   * PATCH /api/v1/users/:id/status
   * Update user account status — Super Admin only
   */
  @Patch(":id/status")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update user account status (Super Admin)" })
  @ApiResponse({ status: 200, description: "Status updated" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  updateUserStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.identityService.updateStatus(id, dto, actor.sub);
  }
}
