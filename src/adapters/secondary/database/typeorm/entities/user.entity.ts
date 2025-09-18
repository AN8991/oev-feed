// TypeORM entity for User
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PositionEntity } from './position.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  address!: string;

  @OneToMany(() => PositionEntity, position => position.user, { cascade: true })
  positions?: PositionEntity[];
}
