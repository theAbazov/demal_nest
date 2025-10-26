import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    // Проверяем существование тура
    const tour = await this.prisma.tour.findUnique({
      where: { id: dto.tour_id },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.status !== 'ACTIVE') {
      throw new BadRequestException('Tour is not active');
    }

    // Проверяем доступность мест
    if (tour.availableSpots < dto.seats_count) {
      throw new BadRequestException('Not enough available spots');
    }

    // Рассчитываем общую стоимость
    const totalAmount = Number(tour.price) * dto.seats_count;

    // Создаем бронирование в транзакции
    return await this.prisma.$transaction(async (tx) => {
      // Создаем бронирование
      const booking = await tx.booking.create({
        data: {
          tourId: dto.tour_id,
          userId,
          seatsCount: dto.seats_count,
          totalAmount,
          name: dto.name,
          email: dto.email,
          status: 'PENDING',
        },
        include: {
          tour: {
            select: {
              id: true,
              title: true,
              date: true,
              time: true,
            },
          },
        },
      });

      // Уменьшаем количество доступных мест
      await tx.tour.update({
        where: { id: dto.tour_id },
        data: {
          availableSpots: tour.availableSpots - dto.seats_count,
        },
      });

      return this.formatBookingResponse(booking as any);
    });
  }

  async getMyBookings(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tour: {
            select: {
              id: true,
              title: true,
              mainImageUrl: true,
              location: true,
              date: true,
              time: true,
              price: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where: { userId } }),
    ]);

    return {
      success: true,
      bookings: bookings.map((booking) => this.formatBookingResponse(booking)),
      pagination: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async cancelBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tour: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Отменяем бронирование в транзакции
    return await this.prisma.$transaction(async (tx) => {
      // Обновляем статус
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // Возвращаем места
      await tx.tour.update({
        where: { id: booking.tourId },
        data: {
          availableSpots: booking.tour.availableSpots + booking.seatsCount,
        },
      });

      return {
        success: true,
        message: 'Booking cancelled successfully',
        booking: this.formatBookingResponse(updatedBooking as any),
      };
    });
  }

  async confirmPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'PAID') {
      throw new BadRequestException('Booking is already paid');
    }

    // В реальности здесь будет проверка платежа через finik.kg
    // Пока просто обновляем статус
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'PAID' },
      include: {
        tour: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            phoneNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Payment confirmed',
      booking: this.formatBookingResponse(updatedBooking as any),
    };
  }

  private formatBookingResponse(booking: any) {
    return {
      booking_id: booking.id,
      tour: booking.tour,
      seats_count: booking.seatsCount,
      total_amount: Number(booking.totalAmount),
      status: booking.status,
      name: booking.name,
      email: booking.email,
      created_at: booking.createdAt,
    };
  }
}
