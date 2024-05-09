import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['userId'])
export class Coin {
  @PrimaryColumn()
  userId: number;

  @Column('decimal', { precision: 18, scale: 8 })
  balance: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
