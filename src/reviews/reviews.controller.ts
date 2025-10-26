import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reviews')
@ApiBearerAuth('JWT-auth')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles('CLIENT')
  @Post()
  @ApiOperation({ summary: 'Создать отзыв на тур' })
  @ApiResponse({ status: 201, description: 'Отзыв создан' })
  @ApiResponse({ status: 400, description: 'Нет бронирования' })
  @ApiResponse({ status: 409, description: 'Отзыв уже существует' })
  async createReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return await this.reviewsService.createReview(userId, dto);
  }
}
