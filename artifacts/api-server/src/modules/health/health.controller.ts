import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/healthz
   * Used by load balancers, monitoring, and readiness probes.
   */
  @Public()
  @SkipThrottle()
  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform health check' })
  @ApiResponse({ status: 200, description: 'Platform is healthy' })
  @ApiResponse({ status: 503, description: 'Platform is degraded' })
  async healthCheck(): Promise<{ status: string }> {
    const result = await this.healthService.check();

    if (result.status === 'down') {
      throw new ServiceUnavailableException({ status: 'down' });
    }

    return { status: result.status };
  }

  /**
   * GET /api/v1/system/info
   */
  @Public()
  @SkipThrottle()
  @Get('v1/system/info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform version and system information' })
  @ApiTags('system')
  systemInfo(): {
    version: string;
    environment: string;
    timestamp: string;
    uptime: number;
  } {
    return {
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
