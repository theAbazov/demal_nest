import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourFiltersDto, TourSortBy } from './dto/tour-filters.dto';

@Injectable()
export class ToursService {
  constructor(private prisma: PrismaService) {}

  async createTour(userId: string, dto: CreateTourDto) {
    // Проверяем, что пользователь является верифицированным партнером
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!partnerProfile || partnerProfile.verificationStatus !== 'VERIFIED') {
      console.log(
        '!partnerProfile || partnerProfile.verificationStatus !== VERIFIED',
      );
      throw new ForbiddenException('Only verified partners can create tours');
    }

    const tour = await this.prisma.tour.create({
      data: {
        title: dto.title,
        mainImageUrl: dto.main_image_url,
        location: dto.location,
        tourType: dto.tour_type,
        date: new Date(dto.date),
        time: dto.time,
        price: dto.price,
        currency: dto.currency || 'KGS',
        availableSpots: dto.available_spots,
        description: dto.description,
        program: dto.program,
        meetingPoint: dto.meeting_point
          ? (dto.meeting_point as any)
          : undefined,
        whatsIncluded: dto.whats_included,
        whatsNotIncluded: dto.whats_not_included,
        whatToBring: dto.what_to_bring,
        imageGalleryUrls: dto.image_gallery_urls,
        organizerId: userId,
      },
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return this.formatTourResponse(tour as any);
  }

  async findAll(filters: TourFiltersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      location,
      tour_type,
      date_from,
      date_to,
      price_min,
      price_max,
      sort_by,
    } = filters;

    const skip = (page - 1) * limit;

    // Building where clause
    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (tour_type) {
      where.tourType = tour_type;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }

    if (price_min !== undefined || price_max !== undefined) {
      where.price = {};
      if (price_min !== undefined) where.price.gte = price_min;
      if (price_max !== undefined) where.price.lte = price_max;
    }

    // Building orderBy clause
    let orderBy: any = { createdAt: 'desc' };

    if (sort_by) {
      switch (sort_by) {
        case TourSortBy.DATE_ASC:
          orderBy = { date: 'asc' };
          break;
        case TourSortBy.DATE_DESC:
          orderBy = { date: 'desc' };
          break;
        case TourSortBy.PRICE_ASC:
          orderBy = { price: 'asc' };
          break;
        case TourSortBy.PRICE_DESC:
          orderBy = { price: 'desc' };
          break;
        case TourSortBy.RATING_DESC:
          orderBy = { createdAt: 'desc' }; // Will sort by rating in application
          break;
      }
    }

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          organizer: {
            select: {
              id: true,
              fullName: true,
              imageUrl: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    const avgRatingsByTourId = await this.getAverageRatingsByTourIds(
      tours.map((tour) => tour.id),
    );
    const formattedTours = tours.map((tour) =>
      this.formatTourResponse(tour as any, avgRatingsByTourId[tour.id] ?? null),
    );

    // Sort by rating if needed
    if (sort_by === TourSortBy.RATING_DESC) {
      formattedTours.sort((a, b) => {
        const ratingA = a.average_rating || 0;
        const ratingB = b.average_rating || 0;
        return ratingB - ratingA;
      });
    }

    return {
      success: true,
      tours: formattedTours,
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tourId: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const avgRating = await this.getAverageRatingForTour(tour.id);

    return {
      success: true,
      tour: this.formatTourResponse(tour as any, avgRating),
    };
  }

  async findMyTours(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where: { organizerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              reviews: true,
              bookings: true,
            },
          },
        },
      }),
      this.prisma.tour.count({ where: { organizerId: userId } }),
    ]);

    const avgRatingsByTourId = await this.getAverageRatingsByTourIds(
      tours.map((tour) => tour.id),
    );
    const formattedTours = tours.map((tour) =>
      this.formatTourResponse(tour as any, avgRatingsByTourId[tour.id] ?? null),
    );

    return {
      success: true,
      tours: formattedTours,
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async updateTour(tourId: string, userId: string, dto: UpdateTourDto) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.organizerId !== userId) {
      throw new ForbiddenException('You can only update your own tours');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.main_image_url !== undefined)
      updateData.mainImageUrl = dto.main_image_url;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.tour_type !== undefined) updateData.tourType = dto.tour_type;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.time !== undefined) updateData.time = dto.time;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.available_spots !== undefined)
      updateData.availableSpots = dto.available_spots;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.program !== undefined) updateData.program = dto.program;
    if (dto.meeting_point !== undefined)
      updateData.meetingPoint = dto.meeting_point as any;
    if (dto.whats_included !== undefined)
      updateData.whatsIncluded = dto.whats_included;
    if (dto.whats_not_included !== undefined)
      updateData.whatsNotIncluded = dto.whats_not_included;
    if (dto.what_to_bring !== undefined)
      updateData.whatToBring = dto.what_to_bring;
    if (dto.image_gallery_urls !== undefined)
      updateData.imageGalleryUrls = dto.image_gallery_urls;

    const updatedTour = await this.prisma.tour.update({
      where: { id: tourId },
      data: updateData,
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            imageUrl: true,
          },
        },
      },
    });

    return {
      success: true,
      tour: this.formatTourResponse(updatedTour as any),
    };
  }

  async deleteTour(tourId: string, userId: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        bookings: true,
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.organizerId !== userId) {
      throw new ForbiddenException('You can only delete your own tours');
    }

    // Check for active bookings
    const activeBookings = tour.bookings.filter(
      (b) => b.status === 'PAID' || b.status === 'PENDING',
    );

    if (activeBookings.length > 0) {
      throw new BadRequestException('Cannot delete tour with active bookings');
    }

    await this.prisma.tour.delete({
      where: { id: tourId },
    });

    return { success: true, message: 'Tour deleted successfully' };
  }

  async getTourBookings(tourId: string, userId: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.organizerId !== userId) {
      throw new ForbiddenException(
        'You can only view bookings for your own tours',
      );
    }

    const bookings = await this.prisma.booking.findMany({
      where: { tourId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            imageUrl: true,
          },
        },
        payments: {
          select: {
            provider: true,
            status: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      bookings: bookings.map((booking) => ({
        booking_id: booking.id,
        user: booking.user,
        seats_count: booking.seatsCount,
        total_amount: booking.totalAmount,
        status: booking.status,
        name: booking.name,
        phone: booking.email,
        email: booking.user.email,
        payment_info: booking.payments[0]
          ? {
              provider: booking.payments[0].provider,
              status: booking.payments[0].status,
              amount: booking.payments[0].amount,
            }
          : null,
        updated_at: booking.updatedAt,
        created_at: booking.createdAt,
      })),
    };
  }

  async getTourReviews(tourId: string, page: number = 1, limit: number = 20) {
    // Проверяем существование тура
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { tourId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where: { tourId } }),
    ]);

    return {
      success: true,
      reviews: reviews.map((review) => ({
        review_id: review.id,
        user: review.user,
        rating: review.rating,
        text: review.text,
        created_at: review.createdAt,
      })),
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  private formatTourResponse(tour: any, avgRating?: number | null) {
    return {
      tour_id: tour.id,
      title: tour.title,
      main_image_url: tour.mainImageUrl,
      location: tour.location,
      tour_type: tour.tourType,
      date: tour.date.toISOString().split('T')[0],
      time: tour.time,
      price: Number(tour.price),
      currency: tour.currency,
      available_spots: tour.availableSpots,
      description: tour.description,
      program: tour.program,
      meeting_point: tour.meetingPoint,
      whats_included: tour.whatsIncluded,
      whats_not_included: tour.whatsNotIncluded,
      what_to_bring: tour.whatToBring,
      image_gallery_urls: tour.imageGalleryUrls,
      organizer: tour.organizer,
      status: tour.status,
      average_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviews_count: tour._count?.reviews || 0,
      created_at: tour.createdAt,
      updated_at: tour.updatedAt,
    };
  }

  private async getAverageRatingsByTourIds(tourIds: string[]) {
    if (!tourIds.length) {
      return {} as Record<string, number | null>;
    }

    const aggregated = await this.prisma.review.groupBy({
      by: ['tourId'],
      where: { tourId: { in: tourIds } },
      _avg: { rating: true },
    });

    return aggregated.reduce(
      (acc, item) => {
        acc[item.tourId] = item._avg.rating ?? null;
        return acc;
      },
      {} as Record<string, number | null>,
    );
  }

  private async getAverageRatingForTour(tourId: string) {
    const result = await this.prisma.review.aggregate({
      where: { tourId },
      _avg: { rating: true },
    });

    return result._avg.rating ?? null;
  }
}
