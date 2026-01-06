import { Controller, Get, Patch, Body, Delete } from '@nestjs/common';
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
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    schema: {
      example: {
        success: true,
        user: {
          user_id: 'uuid',
          phone_number: '+996555123456',
          full_name: 'Иван Петров',
          role: 'CLIENT',
          image_url: null,
          created_at: '2024-01-01T00:00:00Z',
          partner_profile: null,
        },
      },
    },
  })
  async getProfile(@CurrentUser('id') userId: string) {
    return await this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Обновить профиль пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Профиль обновлен',
    schema: {
      example: {
        success: true,
        user: {
          user_id: 'uuid',
          phone_number: '+996555123456',
          full_name: 'Иван Петров',
          role: 'CLIENT',
          image_url: 'https://example.com/avatar.jpg',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.usersService.updateProfile(userId, dto);
  }



  @Delete('account')
  @ApiOperation({ summary: 'Удалить аккаунт пользователя и все связанные данные' })
  @ApiResponse({
    status: 200,
    description: 'Аккаунт успешно удален',
    schema: {
      example: {
        success: true,
        message: 'Аккаунт и все связанные данные успешно удалены',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return await this.usersService.deleteAccount(userId);
  }
}
