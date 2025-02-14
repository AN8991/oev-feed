import { Protocol } from './protocols';

export interface GetUserPositionsOptions {
  limit?: number;
  offset?: number;
  protocol?: Protocol;
}
