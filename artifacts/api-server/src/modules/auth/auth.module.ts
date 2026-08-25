import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    AuditModule,
    IdentityModule, // AuthService injects IdentityService; AuthController injects IdentityService directly
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
