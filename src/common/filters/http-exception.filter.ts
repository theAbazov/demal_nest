import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const error = {
      success: false,
      error: exceptionResponse.error || exceptionResponse.message,
      message:
        typeof exceptionResponse.message === 'string'
          ? exceptionResponse.message
          : exceptionResponse.message?.[0] || 'An error occurred',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(error);
  }
}
