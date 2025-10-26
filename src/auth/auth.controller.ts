import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить OTP код на номер телефона' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP код отправлен' })
  @ApiResponse({ status: 400, description: 'Неверный формат телефона' })
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
        is_new_user: false,
        user: {
          user_id: 'uuid',
          phone_number: '+996555123456',
          full_name: 'Иван Петров',
          role: 'CLIENT',
          image_url: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный OTP код' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return await this.authService.verifyOtp(dto);
  }
}
