// TypeORM entity for User
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  address!: string;

  // Example relation to positions (optional, but common)
  @OneToMany(() => PositionEntity, position => position.user, { cascade: true })
  positions?: PositionEntity[];
}
