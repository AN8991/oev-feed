// TypeORM entity for User
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
// import { PositionEntity } from './position.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  address!: string;

  // Temporarily commented out to resolve circular dependency
  // @OneToMany(() => PositionEntity, position => position.user, { cascade: true })
  // positions?: PositionEntity[];
}
