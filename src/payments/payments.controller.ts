import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { InitPaymentDto } from './dto/init-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('CLIENT')
  @ApiBearerAuth('JWT-auth')
  @Post('payments/init')
  @ApiOperation({ summary: 'Initialize Finik payment' })
  @ApiResponse({ status: 201, description: 'Payment initialized' })
  async initPayment(@CurrentUser('id') userId: string, @Body() dto: InitPaymentDto) {
    return await this.paymentsService.initPayment(userId, dto);
  }

  @Public()
  @Post('payments/webhook/finik')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finik webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook handled' })
  async handleFinikWebhook(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-finik-signature') finikSignature?: string,
    @Headers('x-signature') signature?: string,
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(payload));
    this.paymentsService.verifyWebhookSignature(rawBody, finikSignature || signature);

    await this.paymentsService.processFinikWebhook(payload);

    return { ok: true };
  }

  @Public()
  @Post('payments/finik/webhook')
  @HttpCode(HttpStatus.OK)
  async handleFinikWebhookLegacy(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-finik-signature') finikSignature?: string,
    @Headers('x-signature') signature?: string,
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(payload));
    this.paymentsService.verifyWebhookSignature(rawBody, finikSignature || signature);
    await this.paymentsService.processFinikWebhook(payload);
    return { ok: true };
  }

  @Roles('CLIENT')
  @ApiBearerAuth('JWT-auth')
  @Get('bookings/:bookingId/payment-status')
  @ApiOperation({ summary: 'Get booking payment status' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Payment status fetched' })
  async getPaymentStatus(
    @CurrentUser('id') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return await this.paymentsService.getBookingPaymentStatus(userId, bookingId);
  }
}
