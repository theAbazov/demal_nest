import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        partnerProfile: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: {
        user_id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        image_url: user.imageUrl,
        created_at: user.createdAt,
        partner_profile: user.partnerProfile
          ? {
              profile_id: user.partnerProfile.id,
              company_name: user.partnerProfile.companyName,
              description: user.partnerProfile.description,
              documents_url: user.partnerProfile.documentsUrl,
              verification_status: user.partnerProfile.verificationStatus,
              card_number: user.partnerProfile.cardNumber,
            }
          : null,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: any = {};
    if (dto.full_name !== undefined) {
      updateData.fullName = dto.full_name;
    }
    if (dto.image_url !== undefined) {
      updateData.imageUrl = dto.image_url;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        partnerProfile: true,
      },
    });

    return {
      success: true,
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



  async deleteAccount(userId: string) {
    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        toursOrganized: true,
        bookings: true,
        reviews: true,
        partnerProfile: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.$transaction(async (prisma) => {
      // 1. Удаляем туры, организованные пользователем
      // (это также удалит связанные bookings и reviews благодаря CASCADE)
      if (user.toursOrganized.length > 0) {
        await prisma.tour.deleteMany({
          where: { organizerId: userId },
        });
      }

      // 2. Удаляем пользователя
      // (это автоматически удалит partnerProfile, bookings и reviews благодаря CASCADE)
      await prisma.user.delete({
        where: { id: userId },
      });
    });

    return {
      success: true,
      message: 'Аккаунт и все связанные данные успешно удалены',
    };
  }
}
