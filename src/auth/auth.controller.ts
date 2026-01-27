import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

import { CreateAdminDto } from './dto/create-admin.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-admin')
  @ApiOperation({ summary: 'Регистрация/назначение Админа (по секретному ключу)' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Админ успешно зарегистрирован/обновлен',
    schema: {
      example: {
        success: true,
        message: 'Admin registered successfully',
        auth_token: 'eyJhbGciOiJIUzI1NiIsIn...',
        user: { role: 'ADMIN' },
      },
    },
  })
  async registerAdmin(@Body() dto: CreateAdminDto) {
    return await this.authService.registerAdmin(dto);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить OTP код на email' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP код отправлен',
    schema: {
      example: {
        success: true,
        message: 'Код отправлен на email user@example.com',
        expires_in: 300,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный формат email' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Верификация OTP кода и получение токена' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Успешная авторизация',
    schema: {
      example: {
        success: true,
        auth_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный OTP код' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return await this.authService.verifyOtp(dto);
  }




  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google Token' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        auth_token: 'eyJhbGciOiJIUzI1NiIsIn...',
        is_new_user: true
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid Token' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return await this.authService.loginWithGoogle(dto);
  }
}
