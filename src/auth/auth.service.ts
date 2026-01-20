import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/services/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: dto.email,
    });

    if (error) {
      throw new BadRequestException({
        success: false,
        message: error.message,
      });
    }

    return {
      success: true,
      message: `Код отправлен на email ${dto.email}`,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const supabase = this.supabaseService.getClient();

    const isTestParam =
      (dto.email === 'client@gmail.com' && dto.otp_code === '000000') ||
      (dto.email === 'partner@gmail.com' && dto.otp_code === '111111');

    let data: any = { user: null };
    let error: any = null;

    if (!isTestParam) {
      const response = await supabase.auth.verifyOtp({
        email: dto.email,
        token: dto.otp_code,
        type: 'email',
      });
      data = response.data;
      error = response.error;
    } else {
      // Mock Supabase user for test accounts
      data.user = {
        email: dto.email,
        id: 'test-user-' + dto.email, // Placeholder ID
      };
    }

    if (error || !data.user) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_OTP',
        message: error?.message || 'Неверный код подтверждения',
      });
    }

    // Ищем или создаем пользователя в нашей базе
    // Note: data.user contains Supabase user info. We might want to link it via supabase_id if we store it.
    // For now, we continue reliance on email as unique identifier for our DB.

    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        partnerProfile: true,
      },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          role: 'CLIENT',
        },
        include: {
          partnerProfile: true,
        },
      });
    }

    // Генерируем НАШ JWT токен (не Supabase session)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const authToken = this.jwtService.sign(payload);

    return {
      success: true,
      auth_token: authToken,
    };
  }

  async getGoogleAuthUrl() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${this.configService.get('GOOGLE_CALLBACK_URL')}`,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data.url;
  }

  async getAppleAuthUrl() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${this.configService.get('APPLE_CALLBACK_URL')}`,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data.url;
  }

  async handleSupabaseCallback(code: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      throw new BadRequestException({
        success: false,
        message: error?.message || 'Failed to exchange code for session',
      });
    }

    const email = data.user.email;
    const providerId = data.user.app_metadata.provider === 'google' ? 'googleId' : 'appleId';
    const providerUserId = data.user.user_metadata.sub || data.user.id; // Supabase user ID or provider sub

    if (!email) {
      throw new BadRequestException('Email not found in social provider response');
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { partnerProfile: true },
    });

    if (!user) {
      const userData: any = {
        email,
        role: 'CLIENT',
        fullName: data.user.user_metadata.full_name || data.user.user_metadata.name,
        imageUrl: data.user.user_metadata.avatar_url || data.user.user_metadata.picture,
      };

      if (data.user.app_metadata.provider === 'google') {
          userData.googleId = providerUserId;
      } else if (data.user.app_metadata.provider === 'apple') {
          userData.appleId = providerUserId;
      }

      user = await this.prisma.user.create({
        data: userData,
        include: { partnerProfile: true },
      });
    } else {
        // Link account if not linked (optional, but good for completeness)
        const updateData: any = {};
        if (data.user.app_metadata.provider === 'google' && !user.googleId) {
             updateData.googleId = providerUserId;
        } else if (data.user.app_metadata.provider === 'apple' && !user.appleId) {
             updateData.appleId = providerUserId;
        }

        if (Object.keys(updateData).length > 0) {
             user = await this.prisma.user.update({
                 where: { id: user.id },
                 data: updateData,
                 include: { partnerProfile: true },
             });
        }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const authToken = this.jwtService.sign(payload);

    return {
      success: true,
      auth_token: authToken,
    };
  }

  async registerAdmin(dto: any) {
    // 1. Проверяем секретный ключ
    const adminSecret = this.configService.get('ADMIN_REGISTRATION_SECRET');
    
    if (dto.secret_key !== adminSecret) {
      throw new BadRequestException('Invalid secret key');
    }

    // 2. Ищем или создаем пользователя
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Если пользователя нет, создаем сразу админа
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          role: 'ADMIN',
        },
      });
    } else {
      // Если есть, обновляем роль
      if (user.role !== 'ADMIN') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        });
      }
    }

    // 3. Выдаем токен
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const authToken = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Admin registered successfully',
      auth_token: authToken,
      user: {
        email: user.email,
        role: user.role,
      },
    };
  }
}
