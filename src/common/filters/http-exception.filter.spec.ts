import { BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps non-http exceptions to 500', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const filter = new AllExceptionsFilter();

    filter.catch(new Error('boom'), {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/test' }),
      }),
    } as any);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/test',
        message: 'boom',
      }),
    );
  });

  it('passes through http exception payloads', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const filter = new AllExceptionsFilter();

    filter.catch(new BadRequestException('invalid input'), {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/test' }),
      }),
    } as any);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/test',
        message: expect.objectContaining({
          message: 'invalid input',
          statusCode: 400,
        }),
      }),
    );
  });
});
