import { Controller, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WalletService } from '../wallet/wallet.service';
import { ChargingService } from './charging.service';

@ApiTags('dashboard')
@ApiBearerAuth('BearerAuth')
@Controller('v1/dashboard')
export class DashboardController {
  constructor(
    private readonly walletService: WalletService,
    private readonly chargingService: ChargingService,
  ) {}

  /** GET /api/v1/dashboard — wallet, stats, recent activity in one call */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  async getDashboard(
    @CurrentUser('sub') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    // Resolve the active session first: it may auto-finalize (limit/balance cap),
    // which changes the wallet balance and recent activity below.
    const activeSession = await this.chargingService.getActiveSession(userId, req.correlationId);
    const [wallet, stats, recentSessions, recentTransactions] = await Promise.all([
      this.walletService.getSummary(userId),
      this.chargingService.lifetimeStats(userId),
      this.chargingService.recentSessions(userId),
      this.walletService.recentTransactions(userId),
    ]);
    return {
      wallet,
      ...stats,
      recentSessions,
      recentTransactions,
      activeSession,
    };
  }
}
