import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { KafkaService } from './kafka/kafka.service';
import { MicroserviceOptions } from '@nestjs/microservices';
import { CustomExceptionFilter } from './filters/custom-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const kafkaService = app.get(KafkaService);
  app.connectMicroservice<MicroserviceOptions>(
    kafkaService.getMicroserviceOptions(),
  );

  await app.startAllMicroservices();
  app.useGlobalFilters(new CustomExceptionFilter());
  await app.listen(3000);
}
bootstrap();
