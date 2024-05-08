import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity()
export class Coin {
  @PrimaryColumn()
  userId: number;

  @Column('decimal')
  balance: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
