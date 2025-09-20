import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class PositionDto {
  @IsString()
  id: string = '';

  @IsString()
  @IsNotEmpty()
  userAddress: string = '';

  @IsString()
  @IsNotEmpty()
  protocol: string = '';

  @IsString()
  @IsNotEmpty()
  network: string = '';

  @IsString()
  @IsNotEmpty()
  assetAddress: string = '';

  @IsString()
  @IsNotEmpty()
  assetSymbol: string = '';

  @IsNumberString()
  collateralAmount: string = '0';

  @IsNumberString()
  collateralAmountUSD: string = '0';

  @IsNumberString()
  debtAmount: string = '0';

  @IsNumberString()
  debtAmountUSD: string = '0';

  @IsNumberString()
  healthFactor: string = '0';

  @IsString()
  liquidationThreshold: string = '0';

  @IsString()
  ltv: string = '0';

  @IsNotEmpty()
  updatedAt: Date = new Date();
}

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  userAddress: string = '';

  @IsString()
  @IsNotEmpty()
  protocol: string = '';

  @IsString()
  @IsNotEmpty()
  network: string = '';

  @IsString()
  @IsNotEmpty()
  assetAddress: string = '';

  @IsString()
  @IsNotEmpty()
  assetSymbol: string = '';

  @IsNumberString()
  @IsNotEmpty()
  collateralAmount: string = '0';

  @IsNumberString()
  @IsNotEmpty()
  healthFactor: string = '0';
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
