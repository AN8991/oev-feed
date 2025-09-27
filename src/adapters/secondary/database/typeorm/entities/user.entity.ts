// TypeORM entity for User
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PositionEntity } from './position.entity';
import { Protocol } from '../../../../../domain/enums/protocols.enum';
import { Network } from '../../../../../domain/enums/networks.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  address!: string;

  @Column({ type: 'enum', enum: Protocol, nullable: true })
  protocol?: Protocol;

  @Column({ type: 'enum', enum: Network, nullable: true })
  network?: Network;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated?: Date;

  @OneToMany(() => PositionEntity, position => position.user, { cascade: true })
  positions?: PositionEntity[];
}
