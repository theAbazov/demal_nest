import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/services/supabase.service';
import axios from 'axios';

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

  async validateGoogleToken(accessToken: string) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`,
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    // 1. Verify access token with Google
    const tokenInfo = await this.validateGoogleToken(dto.access_token);

    if (!tokenInfo) {
       throw new BadRequestException({
        success: false,
        message: 'Invalid access token',
      });
    }

    // Optional: Verify that the user_id matches the one in tokenInfo
    // tokenInfo.sub should match dto.user_id if you want strict checking.
    // For now we trust the token validation.

    // 2. Check if user exists by googleId OR email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: dto.user_id }, { email: dto.email }],
      },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.full_name,
          googleId: dto.user_id,
          imageUrl: dto.avatar_url,
          phoneNumber: dto.phoneNumber, // Assuming phoneNumber matches the schema field (nullable)
          role: 'CLIENT',
        },
      });
    } else {
      // User exists. Ensure googleId is set if it wasn't before (linking accounts)
      if (!user.googleId) {
         user = await this.prisma.user.update({
             where: { id: user.id },
             data: { googleId: dto.user_id },
         });
      }
    }

    // 3. Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const authToken = this.jwtService.sign(payload);

    return {
      success: true,
      auth_token: authToken,
      // Status Code 201 for Created (New User), 200 for OK (Existing). 
      // This return object will be sent as body, HTTP status can be controlled in Controller
      is_new_user: isNewUser, 
    };
  }
}
