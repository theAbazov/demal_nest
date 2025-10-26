import { Controller, Get, Patch, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Получить информацию о текущем пользователе' })
  @ApiResponse({ status: 200, description: 'Данные пользователя' })
  async getProfile(@CurrentUser('id') userId: string) {
    return await this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Обновить профиль пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль обновлен' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.usersService.updateProfile(userId, dto);
  }
}
