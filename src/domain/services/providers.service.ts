import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async findAll(): Promise<Provider[]> {
    return this.providerRepo.find();
  }

  async findOne(name: string): Promise<Provider | null> {
    return this.providerRepo.findOneBy({ name });
  }
}
