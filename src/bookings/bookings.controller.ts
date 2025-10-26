import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles('CLIENT')
  @Post()
  @ApiOperation({ summary: 'Создать бронирование' })
  @ApiResponse({ status: 201, description: 'Бронирование создано' })
  @ApiResponse({ status: 400, description: 'Недостаточно мест' })
  @ApiResponse({ status: 404, description: 'Тур не найден' })
  async createBooking(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return await this.bookingsService.createBooking(userId, dto);
  }

  @Roles('CLIENT')
  @Get('my')
  @ApiOperation({ summary: 'Получить свои бронирования' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список бронирований' })
  async getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.bookingsService.getMyBookings(userId, page, limit);
  }

  @Roles('CLIENT')
  @Post(':booking_id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить бронирование' })
  @ApiParam({ name: 'booking_id', description: 'ID бронирования' })
  @ApiResponse({ status: 200, description: 'Бронирование отменено' })
  @ApiResponse({ status: 403, description: 'Нет доступа' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  async cancelBooking(
    @Param('booking_id') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.bookingsService.cancelBooking(bookingId, userId);
  }

  @Public()
  @Post(':booking_id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтвердить оплату (webhook для finik.kg)' })
  @ApiParam({ name: 'booking_id', description: 'ID бронирования' })
  @ApiResponse({ status: 200, description: 'Оплата подтверждена' })
  @ApiResponse({ status: 400, description: 'Уже оплачено' })
  @ApiResponse({ status: 404, description: 'Бронирование не найдено' })
  async confirmPayment(@Param('booking_id') bookingId: string) {
    return await this.bookingsService.confirmPayment(bookingId);
  }
}
