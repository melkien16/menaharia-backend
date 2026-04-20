import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return new Observable((observer) => {
      this.prisma.runInTransaction(async () => {
        try {
          const result = await next.handle().toPromise();
          observer.next(result);
          observer.complete();
        } catch (err) {
          observer.error(err); // This triggers a rollback in runInTransaction
        }
      });
    });
  }
}
