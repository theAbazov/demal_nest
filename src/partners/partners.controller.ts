import { Controller, Post, Get, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Partners')
@ApiBearerAuth('JWT-auth')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Roles('PARTNER', 'CLIENT')
  @Post('profile')
  @ApiOperation({ summary: 'Создать или обновить профиль партнера' })
  @ApiResponse({ status: 200, description: 'Профиль партнера создан/обновлен' })
  async createOrUpdateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePartnerProfileDto,
  ) {
    return await this.partnersService.createOrUpdateProfile(userId, dto);
  }

  @Roles('PARTNER')
  @Get('verification-status')
  @ApiOperation({ summary: 'Получить статус верификации партнера' })
  @ApiResponse({ status: 200, description: 'Статус верификации' })
  async getVerificationStatus(@CurrentUser('id') userId: string) {
    return await this.partnersService.getVerificationStatus(userId);
  }

  @Roles('PARTNER')
  @Get('statistics')
  @ApiOperation({ summary: 'Получить статистику партнера' })
  @ApiResponse({ status: 200, description: 'Статистика партнера' })
  async getStatistics(@CurrentUser('id') userId: string) {
    return await this.partnersService.getStatistics(userId);
  }
}
