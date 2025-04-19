import { IsString, IsNotEmpty, IsDate, IsNumber } from 'class-validator';

export class ProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  network: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsDate()
  lastChecked: Date;

  @IsNumber()
  healthScore: number;
}
