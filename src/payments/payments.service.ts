import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FinikClientService } from './finik-client.service';
import { InitPaymentDto } from './dto/init-payment.dto';

interface FinikWebhookPayload {
  request_id?: string;
  provider_payment_id?: string;
  payment_id?: string;
  transaction_id?: string;
  status?: string;
  [key: string]: unknown;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finikClientService: FinikClientService,
    private readonly configService: ConfigService,
  ) {}

  async initPayment(userId: string, dto: InitPaymentDto) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.booking_id },
        select: {
          id: true,
          userId: true,
          status: true,
          totalAmount: true,
        },
      });

      if (!booking) {
        throw new NotFoundException({
          error: 'BOOKING_NOT_FOUND',
          message: 'Booking not found',
        });
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException({
          error: 'BOOKING_ACCESS_DENIED',
          message: 'You can only pay for your own booking',
        });
      }

      if (booking.status !== 'PENDING') {
        throw new BadRequestException({
          error: 'BOOKING_NOT_PAYABLE',
          message: 'Only pending booking can be paid',
        });
      }

      const paymentAmount = Math.ceil(Number(booking.totalAmount) * 0.1);
      const requestId = randomUUID();

      const finikInit = await this.finikClientService.initPayment({
        requestId,
        bookingId: booking.id,
        userId,
        amount: paymentAmount,
      });

      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
          SELECT booking_id
          FROM bookings
          WHERE booking_id = ${booking.id}
          FOR UPDATE
        `;

          const lockedBooking = await tx.booking.findUnique({
            where: { id: booking.id },
            select: { status: true },
          });

          if (!lockedBooking || lockedBooking.status !== 'PENDING') {
            throw new ConflictException({
              error: 'BOOKING_STATUS_CHANGED',
              message: 'Booking status changed during payment init',
            });
          }

          const activePayment = await tx.payment.findFirst({
            where: {
              bookingId: booking.id,
              status: { in: [PaymentStatus.PENDING, PaymentStatus.PAID] },
            },
            select: { id: true, status: true },
          });

          if (activePayment) {
            throw new ConflictException({
              error: 'ACTIVE_PAYMENT_EXISTS',
              message: 'Payment is already in progress or completed',
            });
          }

          await tx.payment.create({
            data: {
              bookingId: booking.id,
              userId,
              provider: 'FINIK',
              requestId,
              providerPaymentId: finikInit.providerPaymentId,
              amount: paymentAmount,
              status: PaymentStatus.PENDING,
              rawInitResponse: finikInit.rawResponse as Prisma.InputJsonValue,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        booking_id: booking.id,
        request_id: requestId,
        amount: paymentAmount,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2021') {
          throw new InternalServerErrorException({
            error: 'PAYMENTS_TABLE_MISSING',
            message:
              'Payments table is missing. Run Prisma migrations before calling /payments/init',
          });
        }

        if (error.code === 'P2002') {
          throw new ConflictException({
            error: 'PAYMENT_REQUEST_DUPLICATE',
            message: 'Duplicate payment request detected',
          });
        }
      }

      if (error instanceof Error) {
        this.logger.error('initPayment failed', error.stack);
      }

      throw error;
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    const secret = this.configService.get<string>('FINIK_WEBHOOK_SECRET');

    if (!secret) {
      throw new BadRequestException({
        error: 'FINIK_WEBHOOK_SECRET_MISSING',
        message: 'FINIK_WEBHOOK_SECRET is not configured',
      });
    }

    if (!signature) {
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_MISSING',
        message: 'Webhook signature is required',
      });
    }

    const expectedDigest = createHmac('sha256', secret).update(rawBody).digest('hex');
    const normalizedSignature = signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;

    const expected = Buffer.from(expectedDigest, 'utf8');
    const received = Buffer.from(normalizedSignature, 'utf8');

    const isValid =
      expected.length === received.length && timingSafeEqual(expected, received);

    if (!isValid) {
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature is invalid',
      });
    }
  }

  async processFinikWebhook(payload: FinikWebhookPayload) {
    const requestId = payload.request_id ? String(payload.request_id) : undefined;
    const providerPaymentId = payload.provider_payment_id
      ? String(payload.provider_payment_id)
      : payload.payment_id
        ? String(payload.payment_id)
        : payload.transaction_id
          ? String(payload.transaction_id)
          : undefined;

    if (!requestId && !providerPaymentId) {
      throw new BadRequestException({
        error: 'WEBHOOK_IDENTIFIERS_MISSING',
        message: 'request_id or provider_payment_id is required in webhook payload',
      });
    }

    const normalizedStatus = String(payload.status || '').toUpperCase();
    let nextPaymentStatus: PaymentStatus | null = null;

    if (normalizedStatus === 'SUCCEEDED') {
      nextPaymentStatus = PaymentStatus.PAID;
    } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELLED') {
      nextPaymentStatus = PaymentStatus.FAILED;
    }

    await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findFirst({
          where: {
            OR: [
              ...(requestId ? [{ requestId }] : []),
              ...(providerPaymentId ? [{ providerPaymentId }] : []),
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!payment) {
          this.logger.warn('Payment not found for webhook', {
            requestId,
            providerPaymentId,
            status: normalizedStatus,
          });
          return;
        }

        const alreadyFinal =
          payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.FAILED;

        if (alreadyFinal) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              rawWebhookPayload: payload as Prisma.InputJsonValue,
              providerPaymentId: providerPaymentId || payment.providerPaymentId,
            },
          });
          return;
        }

        if (!nextPaymentStatus) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              rawWebhookPayload: payload as Prisma.InputJsonValue,
              providerPaymentId: providerPaymentId || payment.providerPaymentId,
            },
          });
          return;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: nextPaymentStatus,
            providerPaymentId: providerPaymentId || payment.providerPaymentId,
            rawWebhookPayload: payload as Prisma.InputJsonValue,
          },
        });

        if (nextPaymentStatus === PaymentStatus.PAID) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'PAID' },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true };
  }

  async getBookingPaymentStatus(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!booking) {
      throw new NotFoundException({
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found',
      });
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException({
        error: 'BOOKING_ACCESS_DENIED',
        message: 'You can only access your own booking payment status',
      });
    }

    const payment = await this.prisma.payment.findFirst({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'desc' },
      select: {
        amount: true,
        status: true,
        requestId: true,
        providerPaymentId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException({
        error: 'PAYMENT_NOT_FOUND',
        message: 'Payment record not found for booking',
      });
    }

    return {
      booking_id: booking.id,
      booking_status: booking.status,
      payment_status: payment.status,
      amount: payment.amount,
      request_id: payment.requestId,
      provider_payment_id: payment.providerPaymentId,
    };
  }
}
