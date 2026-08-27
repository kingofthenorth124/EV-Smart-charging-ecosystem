import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
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
  initiate(
    @CurrentUser("sub") userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiate(userId, dto);
  }
}
