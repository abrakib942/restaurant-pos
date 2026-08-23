import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    let errorMessage: string;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (message && typeof message === 'object' && 'message' in message) {
      const msgValue = (message as { message: unknown }).message;
      errorMessage =
        typeof msgValue === 'string'
          ? msgValue
          : Array.isArray(msgValue)
            ? msgValue.join(', ')
            : msgValue instanceof Error
              ? msgValue.message
              : 'Internal server error';
    } else {
      errorMessage = 'Internal server error';
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
    );

    response.status(status).json({
      ok: false,
      error: errorMessage,
    });
  }
}
