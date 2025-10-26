import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    // Генерация 4-значного OTP кода
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Вычисляем время истечения (5 минут)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Сохраняем OTP в базу данных
    await this.prisma.otpSession.create({
      data: {
        phoneNumber: dto.phone_number,
        otpCode,
        channel: 'SMS', // TODO: определить по X-App-Type заголовку
        expiresAt,
      },
    });

    // TODO: Отправка реального SMS через nikita.kg
    // Пока просто логируем
    console.log(`OTP code for ${dto.phone_number}: ${otpCode}`);

    return {
      success: true,
      message: `Код отправлен на номер ${dto.phone_number}`,
      expires_in: 300, // 5 минут в секундах
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // Проверяем, существует ли активная OTP сессия
    const otpSession = await this.prisma.otpSession.findFirst({
      where: {
        phoneNumber: dto.phone_number,
        otpCode: dto.otp_code,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpSession) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_OTP',
        message: 'Неверный код подтверждения',
      });
    }

    // Удаляем использованную OTP сессию
    await this.prisma.otpSession.delete({
      where: { id: otpSession.id },
    });

    // Ищем или создаем пользователя
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phone_number },
      include: {
        partnerProfile: true,
      },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber: dto.phone_number,
          role: 'CLIENT',
          isNewUser: true,
        },
        include: {
          partnerProfile: true,
        },
      });
    } else if (user.isNewUser) {
      // Первый вход, снимаем флаг нового пользователя
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isNewUser: false },
        include: {
          partnerProfile: true,
        },
      });
    } else {
      user.isNewUser = false;
    }

    // Генерируем JWT токен
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    const authToken = this.jwtService.sign(payload);

    return {
      success: true,
      auth_token: authToken,
      is_new_user: isNewUser,
      user: {
        user_id: user.id,
        phone_number: user.phoneNumber,
        full_name: user.fullName,
        role: user.role,
        image_url: user.imageUrl,
        created_at: user.createdAt,
      },
    };
  }
}
