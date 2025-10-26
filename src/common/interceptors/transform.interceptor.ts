import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Если ответ уже содержит success, возвращаем как есть
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Иначе оборачиваем в стандартный формат
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
