import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const method = request.method;
    const path = request.path;
    const ip = request.ip;
    const headers = request.headers;
    const body = request.body;
    const userAgent = request.get('user-agent') || '';

    response.on('close', () => {
      const statusCode = response.statusCode;
      const statusMessage = response.statusMessage;
      const contentLength = response.get('content-length');
      const data = response.get('data');

      this.logger.debug({
        request: {
          method,
          path,
          headers: headers as Record<string, unknown>,
          body: body as unknown,
          userAgent,
          ip,
        },
        response: {
          statusCode,
          statusMessage,
          contentLength,
          data,
        },
      });
    });

    if (next) {
      next();
    }
  }
}
