import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from '../../common/types/auth.types';
import { AuthService } from './auth.service';
import { IdentityService } from '../identity/identity.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto/reset-password.dto';
import { RegisterUserDto } from '../identity/dto/register-user.dto';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly identityService: IdentityService,
  ) {}

  /**
   * POST /api/v1/auth/register
   * Self-service registration — rate limited: 5 / 15 min
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  @ApiResponse({ status: 422, description: 'Validation errors' })
  async register(
    @Body() dto: RegisterUserDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.identityService.register(dto, req.correlationId);
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate — rate limited: 10 / 15 min per IP
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive JWT tokens' })
  @ApiResponse({ status: 200, description: 'Authenticated — returns user + tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked or suspended' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.authService.login(dto.email, dto.password, ip, userAgent, req.correlationId);
  }

  /**
   * POST /api/v1/auth/refresh
   * Rotate refresh token — public (uses opaque token, not JWT)
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and receive new token pair' })
  @ApiResponse({ status: 200, description: 'New token pair' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    return this.authService.refreshTokens(dto.refreshToken, req.correlationId);
  }

  /**
   * POST /api/v1/auth/logout
   * Revoke the current session's refresh token
   */
  @ApiBearerAuth('BearerAuth')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out (revoke refresh token)' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    await this.authService.logout(user.sub, dto.refreshToken, req.correlationId);
  }

  /**
   * POST /api/v1/auth/change-password
   * Change password for authenticated user
   */
  @ApiBearerAuth('BearerAuth')
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 204, description: 'Password changed — all sessions revoked' })
  @ApiResponse({ status: 401, description: 'Current password incorrect or not authenticated' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    await this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
      req.correlationId,
    );
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request a password reset (always returns 202 to prevent enumeration)
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 202, description: 'Reset email sent (if account exists)' })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    await this.authService.requestPasswordReset(dto.email, req.correlationId);
    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  /**
   * POST /api/v1/auth/reset-password
   * Confirm password reset with the token from the email
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using email token' })
  @ApiResponse({ status: 204, description: 'Password reset — all sessions revoked' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword, req.correlationId);
  }
}
