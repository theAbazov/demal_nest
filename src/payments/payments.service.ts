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
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Prisma } from '@prisma/client';
import { createVerify, randomUUID } from 'crypto';
import { Request } from 'express';
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

  verifyFinikWebhookSignature(
    req: Request,
    payload: Record<string, unknown>,
    signature: string | undefined,
  ) {
    if (!signature) {
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_MISSING',
        message: 'Finik webhook signature is required',
      });
    }

    const data = this.buildFinikSignaturePayload(req, payload);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(data, 'utf8');
    verifier.end();

    const finikEnv = (this.configService.get<string>('FINIK_ENV') || 'production').toLowerCase();
    const publicKey = finikEnv === 'beta' ? FINIK_BETA_PUBLIC_KEY : FINIK_PROD_PUBLIC_KEY;

    const isValid = verifier.verify(publicKey, signature, 'base64');
    if (!isValid) {
      throw new UnauthorizedException({
        error: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Finik webhook signature is invalid',
      });
    }
  }

  private buildFinikSignaturePayload(req: Request, payload: Record<string, unknown>) {
    const method = req.method.toLowerCase();
    const uriAbsolutePath = req.path;
    const headersPart = this.buildSignedHeadersPart(req);
    const queryString = this.buildSortedQueryString(req.originalUrl || req.url);
    const jsonPayload = JSON.stringify(this.sortJsonKeys(payload));

    if (queryString) {
      return `${method}\n${uriAbsolutePath}\n${headersPart}\n${queryString}\n${jsonPayload}`;
    }

    return `${method}\n${uriAbsolutePath}\n${headersPart}\n${jsonPayload}`;
  }

  private buildSignedHeadersPart(req: Request) {
    const headers = req.headers || {};
    const relevantHeaders: Array<[string, string]> = [];

    const hostHeader = headers.host;
    if (hostHeader) {
      relevantHeaders.push(['host', this.normalizeHeaderValue(hostHeader)]);
    } else {
      relevantHeaders.push(['host', '']);
    }

    for (const [name, value] of Object.entries(headers)) {
      const lowered = name.toLowerCase();
      if (lowered.startsWith('x-api-')) {
        relevantHeaders.push([lowered, this.normalizeHeaderValue(value)]);
      }
    }

    relevantHeaders.sort(([a], [b]) => a.localeCompare(b));
    return relevantHeaders.map(([k, v]) => `${k}:${v}`).join('&');
  }

  private buildSortedQueryString(fullUrl: string) {
    const queryIndex = fullUrl.indexOf('?');
    if (queryIndex === -1 || queryIndex === fullUrl.length - 1) {
      return '';
    }

    const rawQuery = fullUrl.slice(queryIndex + 1);
    const params = new URLSearchParams(rawQuery);
    const pairs: Array<[string, string]> = [];
    params.forEach((value, key) => {
      pairs.push([key, value ?? '']);
    });

    pairs.sort(([aKey, aVal], [bKey, bVal]) => {
      const byKey = aKey.localeCompare(bKey);
      if (byKey !== 0) return byKey;
      return aVal.localeCompare(bVal);
    });

    return pairs
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private normalizeHeaderValue(value: string | string[] | undefined) {
    if (!value) return '';
    return Array.isArray(value) ? value.join(',') : String(value);
  }

  private sortJsonKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortJsonKeys(item));
    }

    if (value && typeof value === 'object') {
      const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      const sortedObject: Record<string, unknown> = {};
      for (const [key, nestedValue] of sortedEntries) {
        sortedObject[key] = this.sortJsonKeys(nestedValue);
      }
      return sortedObject;
    }

    return value;
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
