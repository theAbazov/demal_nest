import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
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
    const isTestEmail = dto.email === 'client@gmail.com' || dto.email === 'partner@gmail.com';

    if (isTestEmail) {
      return {
        success: true,
        message: `Код отправлен на email ${dto.email} (тестовый аккаунт)`,
      };
    }

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
      data.user = {
        email: dto.email,
        id: 'test-user-' + dto.email,
      };
    }

    if (error || !data.user) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_OTP',
        message: error?.message || 'Неверный код подтверждения',
      });
    }

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
    const adminSecret = this.configService.get('ADMIN_REGISTRATION_SECRET');
    
    if (dto.secret_key !== adminSecret) {
      throw new BadRequestException('Invalid secret key');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          role: 'ADMIN',
        },
      });
    } else {
      if (user.role !== 'ADMIN') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
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
      message: 'Admin registered successfully',
      auth_token: authToken,
      user: {
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateSupabaseToken(accessToken: string) {
    const { data, error } = await this.supabaseService.getClient().auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    const supabaseUser = await this.validateSupabaseToken(dto.access_token);

    if (!supabaseUser) {
       throw new BadRequestException({
        success: false,
        message: 'Invalid access token',
      });
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: dto.user_id }, { email: dto.email }],
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.full_name,
          googleId: dto.user_id,
          imageUrl: dto.avatar_url,
          phoneNumber: dto.phoneNumber,
          role: 'CLIENT',
        },
      });
    } else {
      if (!user.googleId) {
         user = await this.prisma.user.update({
             where: { id: user.id },
             data: { googleId: dto.user_id },
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
      is_new_user: isNewUser, 
    };
  }

  async loginWithApple(dto: AppleLoginDto) {
    const supabaseUser = await this.validateSupabaseToken(dto.access_token);

    if (!supabaseUser) {
       throw new BadRequestException({
        success: false,
        message: 'Invalid access token',
      });
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ appleId: dto.user_id }, { email: dto.email }],
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.full_name,
          appleId: dto.user_id,
          phoneNumber: dto.phoneNumber,
          role: 'CLIENT',
        },
      });
    } else {
      if (!user.appleId) {
         user = await this.prisma.user.update({
             where: { id: user.id },
             data: { appleId: dto.user_id },
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
      is_new_user: isNewUser, 
    };
  }
}
