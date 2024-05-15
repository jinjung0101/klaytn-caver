import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import { getKafkaOptions } from './kafka.options';
import { KafkaOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WalletsService } from 'src/wallet/wallets.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {
    this.kafka = new Kafka({
      clientId: this.configService.get('KAFKA_CLIENT_ID'),
      brokers: [this.configService.get('KAFKA_BROKER')],
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    this.consumer = this.kafka.consumer({
      groupId: this.configService.get('KAFKA_CONSUMER_GROUP_ID'),
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: 'transaction-status' });

      this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const payload = JSON.parse(message.value.toString());
            await this.walletsService.handleTransactionMessage(payload);
          } catch (error) {
            console.error(`메시지 처리 실패: ${error.message}`, {
              topic,
              partition,
            });
          }
        },
      });
    } catch (error) {
      console.error('Kafka 클라이언트 초기화 중 오류 발생:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
    } catch (error) {
      console.error('Kafka 연결 해제 중 오류 발생:', error);
    }
  }

  async sendMessage(topic: string, message: any) {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (sendError) {
      console.error('메시지 전송 오류:', sendError);
    }
  }

  getMicroserviceOptions(): KafkaOptions {
    return getKafkaOptions(this.configService);
  }
}
