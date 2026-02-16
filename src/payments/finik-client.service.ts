import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface FinikInitPaymentInput {
  requestId: string;
  bookingId: string;
  userId: string;
  amount: number;
}

export interface FinikInitPaymentOutput {
  providerPaymentId: string | null;
  rawResponse: unknown;
}

@Injectable()
export class FinikClientService {
  private readonly logger = new Logger(FinikClientService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      baseURL: '',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initPayment(input: FinikInitPaymentInput): Promise<FinikInitPaymentOutput> {
    const finikEnv = this.configService.get<string>('FINIK_ENV') || 'production';
    const apiKey = this.configService.get<string>('FINIK_API_KEY');
    const accountId = this.configService.get<string>('FINIK_ACCOUNT_ID');
    const callbackUrl = this.configService.get<string>('FINIK_CALLBACK_URL');
    const betaBaseUrl = this.configService.get<string>('FINIK_BASE_URL_BETA');
    const productionBaseUrl = this.configService.get<string>('FINIK_BASE_URL_PRODUCTION');

    const baseUrl = finikEnv === 'beta' ? betaBaseUrl : productionBaseUrl;

    if (!baseUrl) {
      throw new InternalServerErrorException(
        finikEnv === 'beta'
          ? 'FINIK_BASE_URL_BETA is not configured'
          : 'FINIK_BASE_URL_PRODUCTION is not configured',
      );
    }

    if (!apiKey) {
      throw new InternalServerErrorException('FINIK_API_KEY is not configured');
    }

    if (!accountId) {
      throw new InternalServerErrorException('FINIK_ACCOUNT_ID is not configured');
    }

    if (!callbackUrl) {
      throw new InternalServerErrorException('FINIK_CALLBACK_URL is not configured');
    }

    this.httpClient.defaults.baseURL = baseUrl;

    const payload = {
      query: `mutation CreateItem($input: CreateItemInput!) {
        createItem(input: $input) {
          id
          requestId
          status
        }
      }`,
      operationName: 'CreateItem',
      variables: {
        input: {
          account: { id: accountId },
          callbackUrl,
          requiredFields: [
            { fieldId: 'bookingId', value: input.bookingId },
            { fieldId: 'requestId', value: input.requestId },
            { fieldId: 'userId', value: input.userId },
          ],
          fixedAmount: input.amount,
          name_en: 'Demal booking payment',
          requestId: input.requestId,
          status: 'ENABLED',
          maxAvailableQuantity: 1,
        },
      },
    };

    try {
      const response = await this.httpClient.post('', payload, {
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = response.data?.data?.createItem || response.data;
      const providerPaymentId =
        data?.provider_payment_id || data?.payment_id || data?.id || data?.transaction_id || null;

      return {
        providerPaymentId: providerPaymentId ? String(providerPaymentId) : null,
        rawResponse: data,
      };
    } catch (error) {
      const err = error as AxiosError;
      const status = err.response?.status;
      const responseData = err.response?.data;

      this.logger.error('Failed to initialize Finik payment', {
        requestId: input.requestId,
        bookingId: input.bookingId,
        status,
        error: err.message,
        responseData,
      });

      if (status) {
        throw new BadGatewayException({
          error: 'FINIK_INIT_FAILED',
          message: 'Finik payment initialization failed',
          provider_status: status,
        });
      }

      throw new BadGatewayException({
        error: 'FINIK_UNREACHABLE',
        message: 'Could not reach Finik provider',
      });
    }
  }
}
