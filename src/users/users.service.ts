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
        phone_number: user.phoneNumber,
        full_name: user.fullName,
        role: user.role,
        image_url: user.imageUrl,
        created_at: user.createdAt,
        ...(user.partnerProfile && {
          partner_profile: {
            profile_id: user.partnerProfile.id,
            company_name: user.partnerProfile.companyName,
            description: user.partnerProfile.description,
            documents_url: user.partnerProfile.documentsUrl,
            verification_status: user.partnerProfile.verificationStatus,
            card_number: user.partnerProfile.cardNumber,
          },
        }),
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
}
