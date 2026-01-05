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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get('google')
  @ApiOperation({ summary: 'Авторизация через Google (Redirect)' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth(@Res() res) {
    const url = await this.authService.getGoogleAuthUrl();
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google Callback (Возвращает токен)' })
  @ApiResponse({
    status: 200,
    description: 'Успешная авторизация',
    schema: {
      example: {
        success: true,
        auth_token: 'eyJhbGciOiJIUzI1NiIsIn...',
      },
    },
  })
  async googleAuthRedirect(@Query('code') code: string, @Res() res) {
    if (!code) {
      return res.status(400).json({ success: false, message: 'No code provided' });
    }
    const result = await this.authService.handleSupabaseCallback(code);
    return res.json(result);
  }

  @Get('apple')
  @ApiOperation({ summary: 'Авторизация через Apple (Redirect)' })
  @ApiResponse({ status: 302, description: 'Redirect to Apple OAuth' })
  async appleAuth(@Res() res) {
    const url = await this.authService.getAppleAuthUrl();
    return res.redirect(url);
  }

  @Get('apple/callback')
  @ApiOperation({ summary: 'Apple Callback (Возвращает токен)' })
  @ApiResponse({
    status: 200,
    description: 'Успешная авторизация',
    schema: {
      example: {
        success: true,
        auth_token: 'eyJhbGciOiJIUzI1NiIsIn...',
      },
    },
  })
  async appleAuthRedirect(@Query('code') code: string, @Body('code') bodyCode: string, @Res() res) {
     const authCode = code || bodyCode;
      if (!authCode) {
        return res.status(400).json({ success: false, message: 'No code provided' });
      }
    const result = await this.authService.handleSupabaseCallback(authCode);
    return res.json(result);
  }
}
