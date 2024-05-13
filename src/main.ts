import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { KafkaService } from './kafka/kafka.service';
import { MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const kafkaService = app.get(KafkaService);
  app.connectMicroservice<MicroserviceOptions>(
    kafkaService.getMicroserviceOptions(),
  );

  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();
