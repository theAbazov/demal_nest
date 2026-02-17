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
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { InitPaymentDto } from './dto/init-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

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
    @Req() req: Request,
    @Headers('signature') signature?: string,
    @Headers('x-signature') legacySignature?: string,
    @Headers('x-finik-signature') finikSignature?: string,
  ) {
    const resolvedSignature = signature || legacySignature || finikSignature;
    this.logger.log('WEBHOOK_IN', {
      path: req.path,
      hasSignature: Boolean(resolvedSignature),
      signatureHeader: signature ? 'signature' : legacySignature ? 'x-signature' : finikSignature ? 'x-finik-signature' : null,
      payloadStatus: payload?.status,
      payloadRequestId: (payload as any)?.request_id || (payload as any)?.requestId || (payload as any)?.fields?.requestId,
      payloadTransactionId: (payload as any)?.transaction_id || (payload as any)?.transactionId,
    });

    try {
      await this.paymentsService.verifyFinikWebhookSignature(req, payload, resolvedSignature);
      await this.paymentsService.processFinikWebhook(payload);
      this.logger.log('WEBHOOK_DONE', {
        path: req.path,
        payloadStatus: payload?.status,
      });
    } catch (error) {
      this.logger.error('WEBHOOK_FAILED', {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return { ok: true };
  }

  @Public()
  @Post('payments/finik/webhook')
  @HttpCode(HttpStatus.OK)
  async handleFinikWebhookLegacy(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request,
    @Headers('signature') signature?: string,
    @Headers('x-signature') legacySignature?: string,
    @Headers('x-finik-signature') finikSignature?: string,
  ) {
    const resolvedSignature = signature || legacySignature || finikSignature;
    this.logger.log('WEBHOOK_IN_LEGACY', {
      path: req.path,
      hasSignature: Boolean(resolvedSignature),
      signatureHeader: signature ? 'signature' : legacySignature ? 'x-signature' : finikSignature ? 'x-finik-signature' : null,
      payloadStatus: payload?.status,
      payloadRequestId: (payload as any)?.request_id || (payload as any)?.requestId || (payload as any)?.fields?.requestId,
      payloadTransactionId: (payload as any)?.transaction_id || (payload as any)?.transactionId,
    });

    try {
      await this.paymentsService.verifyFinikWebhookSignature(req, payload, resolvedSignature);
      await this.paymentsService.processFinikWebhook(payload);
      this.logger.log('WEBHOOK_DONE_LEGACY', {
        path: req.path,
        payloadStatus: payload?.status,
      });
    } catch (error) {
      this.logger.error('WEBHOOK_FAILED_LEGACY', {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
