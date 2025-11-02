import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { VerifyPartnerDto } from './dto/verify-partner.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ADMIN')
  @Get('partners')
  @ApiOperation({ summary: 'Получить список партнеров (только для админов)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'PENDING, VERIFIED, REJECTED',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список партнеров' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async getPartners(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.adminService.getPartners(status, page, limit);
  }

  @Roles('ADMIN')
  @Patch('partners/:profile_id/verify')
  @ApiOperation({ summary: 'Верифицировать/отклонить партнера' })
  @ApiParam({ name: 'profile_id', description: 'ID профиля партнера' })
  @ApiResponse({ status: 200, description: 'Статус обновлен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async verifyPartner(
    @Param('profile_id') profileId: string,
    @Body() dto: VerifyPartnerDto,
  ) {
    return await this.adminService.verifyPartner(profileId, dto);
  }

  @Roles('ADMIN')
  @Get('tours')
  @ApiOperation({ summary: 'Получить все туры (только для админов)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список туров' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async getAllTours(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.adminService.getAllTours(page, limit);
  }

  @Roles('ADMIN')
  @Get('statistics')
  @ApiOperation({ summary: 'Получить общую статистику платформы' })
  @ApiResponse({ status: 200, description: 'Статистика платформы' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async getPlatformStatistics() {
    return await this.adminService.getPlatformStatistics();
  }
}
