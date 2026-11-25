import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiException } from '../models/DomainModels.js';

@Catch()
export class ErrorHandlerMiddleware implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno no servidor.';
    let details: unknown = undefined;

    if (exception instanceof ApiException) {
      status = exception.statusCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse();
      message =
        typeof resBody === 'string'
          ? resBody
          : ((resBody as any)?.message ?? exception.message);
      details = typeof resBody === 'object' ? resBody : undefined;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      status,
      erro: message,
      message,
      details,
      path: request?.url,
      timestamp: new Date().toISOString(),
    });
  }
}
