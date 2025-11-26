import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ToursService } from './tours.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourFiltersDto } from './dto/tour-filters.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  // Client endpoints
  @Public()
  @Get()
  @ApiOperation({ summary: 'Получить список туров с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список туров' })
  async findAll(@Query() filters: TourFiltersDto) {
    return await this.toursService.findAll(filters);
  }

  // Partner endpoints - должны быть перед динамическими роутами
  @Roles('PARTNER')
  @ApiBearerAuth('JWT-auth')
  @Get('my')
  @ApiOperation({ summary: 'Получить свои туры' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список туров партнера' })
  async findMyTours(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.toursService.findMyTours(userId, page, limit);
  }

  @Roles('PARTNER')
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Создать новый тур (только для верифицированных партнеров)',
  })
  @ApiResponse({ status: 201, description: 'Тур создан' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTourDto) {
    return await this.toursService.createTour(userId, dto);
  }

  @Roles('PARTNER')
  @ApiBearerAuth('JWT-auth')
  @Get(':tour_id/bookings')
  @ApiOperation({ summary: 'Получить бронирования тура' })
  @ApiParam({ name: 'tour_id', description: 'ID тура' })
  @ApiResponse({ status: 200, description: 'Список бронирований' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async getTourBookings(
    @Param('tour_id', ParseUUIDPipe) tourId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.toursService.getTourBookings(tourId, userId);
  }

  @Public()
  @Get(':tour_id/reviews')
  @ApiOperation({ summary: 'Получить отзывы тура' })
  @ApiParam({ name: 'tour_id', description: 'ID тура' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список отзывов тура' })
  @ApiResponse({ status: 404, description: 'Тур не найден' })
  async getTourReviews(
    @Param('tour_id', ParseUUIDPipe) tourId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.toursService.getTourReviews(tourId, page, limit);
  }

  @Public()
  @Get(':tour_id')
  @ApiOperation({ summary: 'Получить детали тура' })
  @ApiParam({ name: 'tour_id', description: 'ID тура' })
  @ApiResponse({ status: 200, description: 'Детали тура' })
  @ApiResponse({ status: 404, description: 'Тур не найден' })
  async findOne(@Param('tour_id', ParseUUIDPipe) tourId: string) {
    return await this.toursService.findOne(tourId);
  }

  @Roles('PARTNER')
  @ApiBearerAuth('JWT-auth')
  @Patch(':tour_id')
  @ApiOperation({ summary: 'Обновить тур' })
  @ApiParam({ name: 'tour_id', description: 'ID тура' })
  @ApiResponse({ status: 200, description: 'Тур обновлен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Тур не найден' })
  async update(
    @Param('tour_id', ParseUUIDPipe) tourId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTourDto,
  ) {
    return await this.toursService.updateTour(tourId, userId, dto);
  }

  @Roles('PARTNER')
  @ApiBearerAuth('JWT-auth')
  @Delete(':tour_id')
  @ApiOperation({ summary: 'Удалить тур' })
  @ApiParam({ name: 'tour_id', description: 'ID тура' })
  @ApiResponse({ status: 200, description: 'Тур удален' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Тур не найден' })
  async delete(
    @Param('tour_id', ParseUUIDPipe) tourId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.toursService.deleteTour(tourId, userId);
  }
}
