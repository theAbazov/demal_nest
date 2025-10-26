import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateProfile(userId: string, dto: CreatePartnerProfileDto) {
    // Проверяем существование профиля
    const existingProfile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (existingProfile) {
      profile = await this.prisma.partnerProfile.update({
        where: { userId },
        data: {
          companyName: dto.company_name,
          description: dto.description,
          documentsUrl: dto.documents_url,
          cardNumber: dto.card_number,
          verificationStatus: 'PENDING',
        },
      });
    } else {
      profile = await this.prisma.partnerProfile.create({
        data: {
          userId,
          companyName: dto.company_name,
          description: dto.description,
          documentsUrl: dto.documents_url,
          cardNumber: dto.card_number,
        },
      });

      // Обновляем роль пользователя на PARTNER
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'PARTNER' },
      });
    }

    return {
      success: true,
      profile: {
        profile_id: profile.id,
        user_id: profile.userId,
        company_name: profile.companyName,
        description: profile.description,
        documents_url: profile.documentsUrl,
        verification_status: profile.verificationStatus,
        card_number: profile.cardNumber,
      },
    };
  }

  async getVerificationStatus(userId: string) {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ForbiddenException('Partner profile not found');
    }

    return {
      success: true,
      verification_status: profile.verificationStatus,
      admin_comments: profile.verificationComment,
      submitted_at: profile.createdAt,
      reviewed_at: profile.updatedAt,
    };
  }

  async getStatistics(userId: string) {
    const totalTours = await this.prisma.tour.count({
      where: { organizerId: userId },
    });

    const activeTours = await this.prisma.tour.count({
      where: { organizerId: userId, status: 'ACTIVE' },
    });

    const completedTours = await this.prisma.tour.count({
      where: { organizerId: userId, status: 'COMPLETED' },
    });

    const cancelledTours = await this.prisma.tour.count({
      where: { organizerId: userId, status: 'CANCELLED' },
    });

    const totalBookings = await this.prisma.booking.count({
      where: {
        tour: { organizerId: userId },
        status: 'PAID',
      },
    });

    const totalRevenue = await this.prisma.booking.aggregate({
      where: {
        tour: { organizerId: userId },
        status: 'PAID',
      },
      _sum: {
        totalAmount: true,
      },
    });

    const toursWithReviews = await this.prisma.tour.findMany({
      where: { organizerId: userId },
      select: {
        reviews: true,
      },
    });

    const allReviews = toursWithReviews.flatMap((tour) => tour.reviews);
    const averageRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    return {
      success: true,
      statistics: {
        total_tours: totalTours,
        active_tours: activeTours,
        completed_tours: completedTours,
        cancelled_tours: cancelledTours,
        total_bookings: totalBookings,
        total_revenue: Number(totalRevenue._sum.totalAmount || 0),
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: allReviews.length,
      },
    };
  }
}
