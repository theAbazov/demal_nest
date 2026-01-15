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

    const response: any = {
      success: true,
      user: {
        user_id: user.id,
        email: user.email,
        phone_number: user.phoneNumber,
        full_name: user.fullName,
        role: user.role,
        image_url: user.imageUrl,
        created_at: user.createdAt,
      },
    };

    if (user.role === 'PARTNER' && user.partnerProfile) {
      response.user.partner_profile = {
          profile_id: user.partnerProfile.id,
          company_name: user.partnerProfile.companyName,
          description: user.partnerProfile.description,
          documents_url: user.partnerProfile.documentsUrl,
          verification_status: user.partnerProfile.verificationStatus,
          card_number: user.partnerProfile.cardNumber,
      };
    }

    return response;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { partnerProfile: true },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    const updateData: any = {};
    if (dto.full_name !== undefined) updateData.fullName = dto.full_name;
    if (dto.image_url !== undefined) updateData.imageUrl = dto.image_url;
    if (dto.phone_number !== undefined) updateData.phoneNumber = dto.phone_number;

    if (currentUser.role === 'PARTNER' && dto.description !== undefined) {
      if (currentUser.partnerProfile) {
        updateData.partnerProfile = {
          update: {
            description: dto.description,
          },
        };
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        partnerProfile: true,
      },
    });

    const response: any = {
      success: true,
      user: {
        user_id: user.id,
        phone_number: user.phoneNumber,
        full_name: user.fullName,
        role: user.role,
        image_url: user.imageUrl,
        created_at: user.createdAt,
        partner_profile: null,
      },
    };

    if (user.role === 'PARTNER' && user.partnerProfile) {
      response.user.partner_profile = {
        profile_id: user.partnerProfile.id,
        company_name: user.partnerProfile.companyName,
        description: user.partnerProfile.description,
        documents_url: user.partnerProfile.documentsUrl,
        verification_status: user.partnerProfile.verificationStatus,
        card_number: user.partnerProfile.cardNumber,
      };
    }

    return response;
  }



  async deleteAccount(userId: string) {
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
      if (user.toursOrganized.length > 0) {
        await prisma.tour.deleteMany({
          where: { organizerId: userId },
        });
      }

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
