import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class PositionDto {
  @IsString()
  id: string;

  @IsString()
  userAddress: string;

  @IsString()
  protocol: string;

  @IsString()
  asset: string;

  @IsNumberString()
  amount: string;

  @IsNumberString()
  healthFactor: string;

  @IsNotEmpty()
  updatedAt: Date;
}

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @IsString()
  @IsNotEmpty()
  protocol: string;

  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsNumberString()
  @IsNotEmpty()
  healthFactor: string;
}

export class UpdatePositionDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsNumberString()
  healthFactor?: string;

  @IsOptional()
  updatedAt?: Date;
}
