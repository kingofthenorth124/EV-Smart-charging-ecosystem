import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { WalletService } from "./wallet.service";
import { TopUpDto } from "./dto/topup.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("wallet")
@ApiBearerAuth("BearerAuth")

@Controller("v1/wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /** GET /api/v1/wallet — current user's wallet summary */
  @Permissions("wallet:read")
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user's wallet summary" })
  @ApiResponse({ status: 200, description: "Wallet summary" })
  getWallet(@CurrentUser("sub") userId: string) {
    return this.walletService.getSummary(userId);
  }

  /** POST /api/v1/wallet/topup — top up the wallet */
  @Permissions("wallet:topup")
  @Post("topup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Top up the wallet" })
  @ApiResponse({ status: 201, description: "Top-up completed" })
  @ApiResponse({ status: 403, description: "Wallet suspended" })
  topUp(
    @CurrentUser("sub") userId: string,
    @Body() dto: TopUpDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.walletService.topUp(userId, dto, req.correlationId);
  }

  /** GET /api/v1/wallet/transactions — paginated transaction history */
  @Permissions("wallet:read")
  @Get("transactions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List wallet transactions" })
  @ApiResponse({ status: 200, description: "Paginated transactions" })
  listTransactions(
    @CurrentUser("sub") userId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.walletService.listTransactions(userId, query);
  }
}
