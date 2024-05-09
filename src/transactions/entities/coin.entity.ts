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

  @Column('decimal')
  balance: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
