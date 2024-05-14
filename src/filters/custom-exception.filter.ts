import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import logger from 'src/logging/logger';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    // 개발자를 위한 로그 출력
    const stack = exception instanceof Error ? exception.stack : '';
    logger.error(
      `HTTP 상태: ${status} 오류 메세지: ${message} 스택: ${stack}`,
      {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        query: request.query,
        params: request.params,
        body: request.body,
      },
    );

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: status === 500 ? '서버 오류' : message,
    };

    response.status(status).json(errorResponse);
  }
}
