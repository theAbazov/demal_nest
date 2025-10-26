import { Controller, Post, Get, Body } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Roles('PARTNER', 'CLIENT')
  @Post('profile')
  async createOrUpdateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePartnerProfileDto,
  ) {
    return await this.partnersService.createOrUpdateProfile(userId, dto);
  }

  @Roles('PARTNER')
  @Get('verification-status')
  async getVerificationStatus(@CurrentUser('id') userId: string) {
    return await this.partnersService.getVerificationStatus(userId);
  }

  @Roles('PARTNER')
  @Get('statistics')
  async getStatistics(@CurrentUser('id') userId: string) {
    return await this.partnersService.getStatistics(userId);
  }
}
