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

export type ApiOk<T> = {
  ok: true;
  message?: string;
  data?: T;
};

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiOk<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiOk<T>> {
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

          const body: ApiOk<unknown> = { ok: true };
          if (result.message) body.message = result.message;
          if (result.data !== undefined) body.data = result.data;
          return body as ApiOk<T>;
        }

        if (data && typeof data === 'object' && 'ok' in data) {
          return data as ApiOk<T>;
        }

        const body: ApiOk<T> = { ok: true };
        if (data !== undefined) {
          body.data = data as T;
        }
        return body;
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
