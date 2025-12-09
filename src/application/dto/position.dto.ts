import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class PositionDto {
  @IsString()
  @IsNotEmpty({ message: 'Position ID is required' })
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
  @IsNotEmpty({ message: 'Collateral amount is required' })
  collateralAmount: string = '0';

  @IsNumberString()
  collateralAmountUSD: string = '0';

  @IsNumberString()
  debtAmount: string = '0';

  @IsNumberString()
  debtAmountUSD: string = '0';

  @IsNumberString()
  @IsNotEmpty({ message: 'Health factor is required' })
  healthFactor: string = '0';

  @IsString()
  @IsNotEmpty({ message: 'Liquidation threshold is required' })
  liquidationThreshold: string = '0';

  @IsString()
  @IsNotEmpty({ message: 'LTV is required' })
  ltv: string = '0';

  /**
   * Timestamp of when the position was last updated
   * Using lastUpdated for consistency with PositionEntity and PositionModel
   */
  @IsNotEmpty()
  lastUpdated: Date = new Date();
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
  lastUpdated?: Date;
}
