import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // Проверяем существование тура
    const tour = await this.prisma.tour.findUnique({
      where: { id: dto.tour_id },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    // Проверяем, что пользователь уже оставил бронирование на этот тур
    const paidBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        tourId: dto.tour_id,
        status: 'PAID',
      },
    });

    if (!paidBooking) {
      throw new BadRequestException(
        'You must have a paid booking for this tour to leave a review',
      );
    }

    // Проверяем, не оставлял ли пользователь уже отзыв на этот тур
    const existingReview = await this.prisma.review.findUnique({
      where: {
        tourId_userId: {
          tourId: dto.tour_id,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this tour');
    }

    // Создаем отзыв
    const review = await this.prisma.review.create({
      data: {
        tourId: dto.tour_id,
        userId,
        rating: dto.rating,
        text: dto.text,
      },
      include: {
        user: {
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
      review: {
        review_id: review.id,
        tour_id: review.tourId,
        user: review.user,
        rating: review.rating,
        text: review.text,
        created_at: review.createdAt,
      },
    };
  }
}
