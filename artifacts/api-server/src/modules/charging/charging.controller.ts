import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";
import { ChargingService } from "./charging.service";
import { StartSessionDto } from "./dto/start-session.dto";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("charging")
@ApiBearerAuth("BearerAuth")
@Controller("v1")
export class ChargingController {
  constructor(private readonly chargingService: ChargingService) {}

  /** GET /api/v1/stations — charging stations with live availability */
  @Permissions("stations:read")
  @Get("stations")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List charging stations" })
  @ApiResponse({ status: 200, description: "Stations with live availability" })
  listStations() {
    return this.chargingService.listStations();
  }

  /** GET /api/v1/sessions — the current user's session history */
  @Permissions("sessions:read")
  @Get("sessions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the current user's charging sessions" })
  @ApiResponse({ status: 200, description: "Paginated sessions" })
  listSessions(
    @CurrentUser("sub") userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.chargingService.listSessions(userId, query);
  }

  /** GET /api/v1/sessions/active — live active session (or null) */
  @Permissions("sessions:read")
  @Get("sessions/active")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current active charging session" })
  @ApiResponse({ status: 200, description: "Active session or null" })
  async getActiveSession(
    @CurrentUser("sub") userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const session = await this.chargingService.getActiveSession(
      userId,
      req.correlationId,
    );
    return { session };
  }

  /** POST /api/v1/sessions/start — authorize and start a charging session */
  @Permissions("sessions:authorize")
  @Post("sessions/start")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Start a charging session" })
  @ApiResponse({ status: 201, description: "Session started" })
  @ApiResponse({ status: 402, description: "Insufficient wallet balance" })
  @ApiResponse({
    status: 409,
    description: "Session already active or station unavailable",
  })
  startSession(
    @CurrentUser("sub") userId: string,
    @Body() dto: StartSessionDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.chargingService.startSession(userId, dto, req.correlationId);
  }

  /** POST /api/v1/sessions/:id/stop — stop and settle a charging session */
  @Permissions("sessions:stop")
  @Post("sessions/:id/stop")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stop a charging session" })
  @ApiResponse({ status: 200, description: "Session stopped and settled" })
  @ApiResponse({ status: 404, description: "Session not found" })
  @ApiResponse({ status: 409, description: "Session not active" })
  stopSession(
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.chargingService.stopSession(userId, id, req.correlationId);
  }
}
