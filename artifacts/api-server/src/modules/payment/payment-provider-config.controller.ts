import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { UpdatePaymentProviderConfigDto } from "./dto/update-payment-provider-config.dto";
import { PaymentProviderConfigService } from "./payment-provider-config.service";

@ApiTags("payment-provider-config")
@ApiBearerAuth("BearerAuth")
@Controller("v1/developer/payment-providers")
export class PaymentProviderConfigController {
  constructor(
    private readonly configService: PaymentProviderConfigService,
  ) {}

  @Get()
  @Roles("SUPER_ADMIN")
  @ApiOperation({
    summary: "Get active payment-provider routing configuration",
  })
  @ApiResponse({
    status: 200,
    description: "Current payment-provider configuration",
  })
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update payment-provider routing configuration",
  })
  @ApiResponse({
    status: 200,
    description: "Payment-provider configuration updated",
  })
  updateConfig(
    @Body() dto: UpdatePaymentProviderConfigDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    void req;
    return this.configService.updateConfig(dto);
  }
}
