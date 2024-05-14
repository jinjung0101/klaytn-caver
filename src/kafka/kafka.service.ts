import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import { Transport, KafkaOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WalletsService } from 'src/wallet/wallets.service';
import { MockCaver } from 'src/utils/mocking-caver.utils';

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
      createPartitioner: Partitioners.LegacyPartitioner, //이전 버전과 동일한 파티셔닝 동작을 유지하기 위함
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
            const retryCount = payload.retryCount || 0;
            const delay = 5000 * (retryCount + 1); // 점진적 백오프 적용, 5초 단위로 증가

            setTimeout(async () => {
              const transactionStatus = await MockCaver.getTransaction(
                payload.transactionHash,
              );
              switch (transactionStatus.status) {
                case 'Committed':
                  // 트랜잭션이 완료되었을 때 필요한 작업 수행
                  await this.walletsService.transactionCompletion(
                    payload.transactionHash,
                  );
                  break;
                case 'CommitError':
                  // 트랜잭션이 실패했을 때 오류 처리
                  await this.walletsService.transactionError(
                    payload.status,
                    payload.transactionHash,
                  );
                  break;
                case 'Submitted':
                  // 재시도 횟수와 함께 메시지를 다시 큐에 추가
                  this.sendMessage('transaction-status', {
                    ...payload,
                    retryCount: retryCount + 1,
                  });
                  break;
              }
            }, delay);
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
    return {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [this.configService.get('KAFKA_BROKER')],
        },
        consumer: {
          groupId: this.configService.get('KAFKA_CONSUMER_GROUP_ID'),
        },
      },
    };
  }
}
