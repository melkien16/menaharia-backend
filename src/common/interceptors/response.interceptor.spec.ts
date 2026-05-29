import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  it('wraps successful responses', async () => {
    const interceptor = new ResponseInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(
        {} as any,
        {
          handle: () => of({ id: '1', name: 'Item' }),
        } as any,
      ),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', name: 'Item' });
    expect(typeof result.timestamp).toBe('string');
  });
});
