import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
import { Permissions } from "../../common/decorators/permissions.decorator";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { PaymentResponseDto } from "./dto/payment-response.dto";
import { PaymentService } from "./payment.service";

@ApiTags("payments")
@ApiBearerAuth("BearerAuth")
@Controller("v1/payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Permissions("wallet:topup")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Initiate a wallet payment" })
  @ApiResponse({
    status: 201,
    description: "Payment initiated",
    type: PaymentResponseDto,
  })
  initiate(
    @CurrentUser("sub") userId: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.paymentService.initiate(userId, dto, req.correlationId);
  }

  /**
   * Sandbox payment completion endpoint.
   *
   * In production this should normally be called by the verified
   * payment-provider webhook rather than directly by a client.
   */
  @Post("complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete a sandbox payment" })
  @ApiResponse({
    status: 200,
    description: "Payment completed",
    type: PaymentResponseDto,
  })
  complete(
    @Body("providerReference") providerReference: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.paymentService.complete(providerReference, req.correlationId);
  }
}
