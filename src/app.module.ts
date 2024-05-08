import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { SpendingModule } from './spending/spending.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    UsersModule,
    WalletModule,
    SpendingModule,
    TransactionsModule,
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // real project에서는 수정필요
        // logging: true,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
