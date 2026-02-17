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
import { Signer } from '@mancho.devs/authorizer';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { FinikClientService } from './finik-client.service';
import { InitPaymentDto } from './dto/init-payment.dto';

interface FinikWebhookPayload {
  request_id?: string;
  requestId?: string;
  provider_payment_id?: string;
  providerPaymentId?: string;
  payment_id?: string;
  paymentId?: string;
  transaction_id?: string;
  transactionId?: string;
  id?: string;
  fields?: Record<string, unknown>;
  data?: Record<string, unknown>;
  status?: string;
  [key: string]: unknown;
}

const FINIK_PROD_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuF/PUmhMPPidcMxhZBPb
BSGJoSphmCI+h6ru8fG8guAlcPMVlhs+ThTjw2LHABvciwtpj51ebJ4EqhlySPyT
hqSfXI6Jp5dPGJNDguxfocohaz98wvT+WAF86DEglZ8dEsfoumojFUy5sTOBdHEu
g94B4BbrJvjmBa1YIx9Azse4HFlWhzZoYPgyQpArhokeHOHIN2QFzJqeriANO+wV
aUMta2AhRVZHbfyJ36XPhGO6A5FYQWgjzkI65cxZs5LaNFmRx6pjnhjIeVKKgF99
4OoYCzhuR9QmWkPl7tL4Kd68qa/xHLz0Psnuhm0CStWOYUu3J7ZpzRK8GoEXRcr8
tQIDAQAB
-----END PUBLIC KEY-----`;

const FINIK_BETA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwlrlKz/8gLWd1ARWGA/8
o3a3Qy8G+hPifyqiPosiTY6nCHovANMIJXk6DH4qAqqZeLu8pLGxudkPbv8dSyG7
F9PZEAryMPzjoB/9P/F6g0W46K/FHDtwTM3YIVvstbEbL19m8yddv/xCT9JPPJTb
LsSTVZq5zCqvKzpupwlGS3Q3oPyLAYe+ZUn4Bx2J1WQrBu3b08fNaR3E8pAkCK27
JqFnP0eFfa817VCtyVKcFHb5ij/D0eUP519Qr/pgn+gsoG63W4pPHN/pKwQUUiAy
uLSHqL5S2yu1dffyMcMVi9E/Q2HCTcez5OvOllgOtkNYHSv9pnrMRuws3u87+hNT
ZwIDAQAB
-----END PUBLIC KEY-----`;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finikClientService: FinikClientService,
    private readonly configService: ConfigService,
  ) {}

  async verifyFinikWebhookSignature(
    req: Request,
    payload: Record<string, unknown>,
    signature: string | undefined,
  ) {
    this.logger.log('WEBHOOK_VERIFY_START', {
      path: req.path,
      method: req.method,
      hasSignature: Boolean(signature),
      finikEnv: (this.configService.get<string>('FINIK_ENV') || 'production').toLowerCase(),
      payloadStatus: payload?.status,
    });

    if (!signature) {
      this.logger.warn('WEBHOOK_VERIFY_MISSING_SIGNATURE', {
        path: req.path,
      });
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_MISSING',
        message: 'Finik webhook signature is required',
      });
    }

    const finikEnv = (this.configService.get<string>('FINIK_ENV') || 'production').toLowerCase();
    const publicKey = finikEnv === 'beta' ? FINIK_BETA_PUBLIC_KEY : FINIK_PROD_PUBLIC_KEY;
    const requestData = this.buildAuthorizerRequestData(req, payload);
    
    // Explicitly using console.log to see the exact structure being passed to Signer
    console.log('Finik Verifier Request Data:', JSON.stringify(requestData, null, 2));

    const isValid = await new Signer(requestData).verify(publicKey, signature);
    if (!isValid) {
      this.logger.warn('WEBHOOK_VERIFY_INVALID_SIGNATURE', {
        path: req.path,
        finikEnv,
        signatureLength: signature.length,
        signature, // Log the received signature for debugging
      });
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Finik webhook signature is invalid',
      });
    }

    this.logger.log('WEBHOOK_VERIFY_OK', {
      path: req.path,
      finikEnv,
    });
  }

  private buildAuthorizerRequestData(req: Request, payload: Record<string, unknown>) {
    const headers: Record<string, string | undefined> = {};
    
    // The @mancho.devs/authorizer library specifically looks for 'Host' (capitalized)
    // in the headers object. Since express/node lowercases headers, we must manually
    // set 'Host' with a capital H.
    const host = req.headers['host'];
    if (host) {
        headers['Host'] = String(host);
    }

    // Include other x-api- headers
    for (const [name, value] of Object.entries(req.headers || {})) {
      if (name.toLowerCase().startsWith('x-api-')) {
          headers[name] = this.normalizeHeaderValue(value);
      }
    }

    return {
      body: payload,
      headers,
      httpMethod: req.method,
      // @mancho.devs/authorizer might expect the full path or just the path
      // usually it's req.path or req.originalUrl without query params
      path: req.path, 
      queryStringParameters: this.buildQueryStringParams(req.originalUrl || req.url),
    };
  }

  private buildQueryStringParams(fullUrl: string): Record<string, string | undefined> | null {
    const queryIndex = fullUrl.indexOf('?');
    if (queryIndex === -1 || queryIndex === fullUrl.length - 1) {
      return null;
    }

    const rawQuery = fullUrl.slice(queryIndex + 1);
    const parts = rawQuery.split('&').filter(Boolean);
    if (!parts.length) return null;

    const queryParams: Record<string, string | undefined> = {};
    for (const part of parts) {
      const [rawKey, rawValue] = part.split('=', 2);
      const key = decodeURIComponent(rawKey || '');
      if (!key) continue;
      queryParams[key] =
        rawValue === undefined ? undefined : decodeURIComponent(rawValue.replace(/\+/g, ' '));
    }

    return Object.keys(queryParams).length ? queryParams : null;
  }

  private normalizeHeaderValue(value: string | string[] | undefined) {
    if (!value) return '';
    return Array.isArray(value) ? value.join(',') : String(value);
  }

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

  async processFinikWebhook(payload: FinikWebhookPayload) {
    const requestId = this.extractRequestId(payload);
    const providerPaymentId = this.extractProviderPaymentId(payload);
    const normalizedStatus = String(payload.status || '').toUpperCase();

    this.logger.log('WEBHOOK_PROCESS_START', {
      requestId,
      providerPaymentId,
      normalizedStatus,
      payloadTransactionId: payload.transaction_id || payload.transactionId,
      payloadId: payload.id,
      payloadBookingId:
        payload.fields?.bookingId || payload.fields?.booking_id || payload.data?.bookingId,
    });

    if (!requestId && !providerPaymentId) {
      this.logger.warn('WEBHOOK_PROCESS_IDENTIFIERS_MISSING', {
        payloadKeys: Object.keys(payload || {}),
      });
      throw new BadRequestException({
        error: 'WEBHOOK_IDENTIFIERS_MISSING',
        message: 'request_id or provider_payment_id is required in webhook payload',
      });
    }

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

        this.logger.log('WEBHOOK_PAYMENT_FOUND', {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          currentStatus: payment.status,
          requestId: payment.requestId,
          providerPaymentId: payment.providerPaymentId,
        });

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
          this.logger.log('WEBHOOK_PAYMENT_ALREADY_FINAL', {
            paymentId: payment.id,
            currentStatus: payment.status,
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
          this.logger.log('WEBHOOK_PAYMENT_STATUS_IGNORED', {
            paymentId: payment.id,
            incomingStatus: normalizedStatus,
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
        this.logger.log('WEBHOOK_PAYMENT_UPDATED', {
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: nextPaymentStatus,
        });

        if (nextPaymentStatus === PaymentStatus.PAID) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'PAID' },
          });
          this.logger.log('WEBHOOK_BOOKING_UPDATED', {
            bookingId: payment.bookingId,
            status: 'PAID',
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log('WEBHOOK_PROCESS_DONE', {
      requestId,
      providerPaymentId,
      normalizedStatus,
      nextPaymentStatus,
    });
    return { ok: true };
  }

  private extractRequestId(payload: FinikWebhookPayload) {
    const fromRoot = payload.request_id ?? payload.requestId;
    if (fromRoot) return String(fromRoot);

    const fromFields = payload.fields?.requestId ?? payload.fields?.request_id;
    if (fromFields) return String(fromFields);

    const fromData = payload.data?.requestId ?? payload.data?.request_id;
    if (fromData) return String(fromData);

    return undefined;
  }

  private extractProviderPaymentId(payload: FinikWebhookPayload) {
    const value =
      payload.provider_payment_id ??
      payload.providerPaymentId ??
      payload.payment_id ??
      payload.paymentId ??
      payload.transaction_id ??
      payload.transactionId ??
      payload.id;

    return value ? String(value) : undefined;
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
