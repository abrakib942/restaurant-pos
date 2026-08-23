import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiceResult } from '@/common/interfaces/service-result.interface';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode?: number }>();
    const request = ctx.getRequest<{ url?: string }>();
    const statusCode = response.statusCode || HttpStatus.OK;
    const path = request.url || '';

    return next.handle().pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'success' in data) {
          const result = data as ServiceResult<unknown>;

          if (!result.success) {
            const errorName = result.error?.name ?? 'badRequest';
            const errorMessage = result.error?.message ?? result.message ?? 'Request failed';
            const status =
              errorName === 'unauthorized'
                ? HttpStatus.UNAUTHORIZED
                : errorName === 'forbidden'
                  ? HttpStatus.FORBIDDEN
                  : HttpStatus.BAD_REQUEST;
            throw new HttpException(errorMessage, status);
          }

          return {
            statusCode,
            message: result.message || 'Request successful',
            data: result.data as T,
            timestamp: new Date().toISOString(),
            path,
          };
        }

        return {
          statusCode,
          message: 'Request successful',
          data: data as T,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return throwError(() => new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR));
      }),
    );
  }
}
