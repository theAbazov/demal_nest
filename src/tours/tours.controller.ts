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
} from '@nestjs/common';
import { ToursService } from './tours.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourFiltersDto } from './dto/tour-filters.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  // Client endpoints
  @Public()
  @Get()
  async findAll(@Query() filters: TourFiltersDto) {
    return await this.toursService.findAll(filters);
  }

  @Public()
  @Get(':tour_id')
  async findOne(@Param('tour_id') tourId: string) {
    return await this.toursService.findOne(tourId);
  }

  // Partner endpoints
  @Roles('PARTNER')
  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTourDto) {
    return await this.toursService.createTour(userId, dto);
  }

  @Roles('PARTNER')
  @Get('my')
  async findMyTours(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.toursService.findMyTours(userId, page, limit);
  }

  @Roles('PARTNER')
  @Patch(':tour_id')
  async update(
    @Param('tour_id') tourId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTourDto,
  ) {
    return await this.toursService.updateTour(tourId, userId, dto);
  }

  @Roles('PARTNER')
  @Delete(':tour_id')
  async delete(
    @Param('tour_id') tourId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.toursService.deleteTour(tourId, userId);
  }

  @Roles('PARTNER')
  @Get(':tour_id/bookings')
  async getTourBookings(
    @Param('tour_id') tourId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.toursService.getTourBookings(tourId, userId);
  }
}
