import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyPartnerDto } from './dto/verify-partner.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPartners(status?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.verificationStatus = status;
    }

    const [partners, total] = await Promise.all([
      this.prisma.partnerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              fullName: true,
              imageUrl: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.partnerProfile.count({ where }),
    ]);

    return {
      success: true,
      partners: partners.map((profile) => ({
        profile_id: profile.id,
        user: profile.user,
        company_name: profile.companyName,
        description: profile.description,
        documents_url: profile.documentsUrl,
        verification_status: profile.verificationStatus,
        verification_comment: profile.verificationComment,
        card_number: profile.cardNumber,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async verifyPartner(profileId: string, dto: VerifyPartnerDto) {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Partner profile not found');
    }

    const updatedProfile = await this.prisma.partnerProfile.update({
      where: { id: profileId },
      data: {
        verificationStatus: dto.action,
        verificationComment: dto.comment,
        ...(dto.action === 'VERIFIED'
          ? {
              user: {
                update: {
                  role: 'PARTNER',
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Partner ${dto.action.toLowerCase()} successfully`,
      profile: {
        profile_id: updatedProfile.id,
        user: updatedProfile.user,
        company_name: updatedProfile.companyName,
        verification_status: updatedProfile.verificationStatus,
        verification_comment: updatedProfile.verificationComment,
      },
    };
  }

  async getAllTours(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.tour.count(),
    ]);

    return {
      success: true,
      tours: tours.map((tour) => ({
        tour_id: tour.id,
        title: tour.title,
        location: tour.location,
        status: tour.status,
        organizer: tour.organizer,
        date: tour.date.toISOString().split('T')[0],
        price: Number(tour.price),
        available_spots: tour.availableSpots,
        bookings_count: tour._count.bookings,
        reviews_count: tour._count.reviews,
        created_at: tour.createdAt,
      })),
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getPlatformStatistics() {
    // Общая статистика пользователей
    const totalUsers = await this.prisma.user.count();
    const totalClients = await this.prisma.user.count({
      where: { role: 'CLIENT' },
    });
    const totalPartners = await this.prisma.user.count({
      where: { role: 'PARTNER' },
    });

    // Статистика партнеров
    const verifiedPartners = await this.prisma.partnerProfile.count({
      where: { verificationStatus: 'VERIFIED' },
    });
    const pendingPartners = await this.prisma.partnerProfile.count({
      where: { verificationStatus: 'PENDING' },
    });

    // Статистика туров
    const totalTours = await this.prisma.tour.count();
    const activeTours = await this.prisma.tour.count({
      where: { status: 'ACTIVE' },
    });
    const completedTours = await this.prisma.tour.count({
      where: { status: 'COMPLETED' },
    });

    // Статистика бронирований
    const totalBookings = await this.prisma.booking.count();
    const paidBookings = await this.prisma.booking.count({
      where: { status: 'PAID' },
    });
    const totalRevenue = await this.prisma.booking.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });

    // Статистика отзывов
    const totalReviews = await this.prisma.review.count();
    const avgRatingResult = await this.prisma.review.aggregate({
      _avg: { rating: true },
    });

    return {
      success: true,
      statistics: {
        users: {
          total: totalUsers,
          clients: totalClients,
          partners: totalPartners,
        },
        partners: {
          verified: verifiedPartners,
          pending: pendingPartners,
        },
        tours: {
          total: totalTours,
          active: activeTours,
          completed: completedTours,
        },
        bookings: {
          total: totalBookings,
          paid: paidBookings,
          total_revenue: Number(totalRevenue._sum.totalAmount || 0),
        },
        reviews: {
          total: totalReviews,
          average_rating:
            totalReviews > 0
              ? Math.round(Number(avgRatingResult._avg.rating) * 10) / 10
              : 0,
        },
      },
    };
  }
}
