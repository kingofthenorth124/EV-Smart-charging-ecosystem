import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { PaymentService } from "./payment.service";
import type { PaymentProviderName } from "./providers/payment-provider.interface";

/**
 * Payment provider webhook receiver.
 *
 * Excluded from Swagger — this endpoint is never called by a browser client,
 * only by the payment provider's own servers. Signature verification happens
 * BEFORE any payload is trusted or passed to PaymentService.
 *
 * Route: POST /api/v1/payments/webhooks/:provider
 */
@ApiExcludeController()
@Public()
@Controller("v1/payments/webhooks")
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param("provider") provider: string,
    @Headers() headers: Record<string, string | undefined>,
    @Req() req: RawBodyRequest<Request> & { correlationId?: string },
  ) {
    if (!req.rawBody) {
      throw new BadRequestException(
        "Raw request body unavailable — check rawBody bootstrap config",
      );
    }

    const providerName = provider.toUpperCase() as PaymentProviderName;

    const verified = this.paymentService.verifyWebhookSignature(
      providerName,
      req.rawBody,
      headers,
    );

    if (!verified) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    return this.paymentService.processVerifiedWebhook(
      providerName,
      req.rawBody,
      req.correlationId,
    );
  }
}
