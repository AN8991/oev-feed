/*
 * File: providers.enum.ts
 * Description: Enum representing supported provider types (e.g., Alchemy, Infura, Ankr, etc.).
 * Layer: Domain
 */

export enum Providers {
  ALCHEMY = 'alchemy',
  INFURA = 'infura',
  BLOCKDAEMON = 'blockdaemon',
  BLOCKCYPHER = 'blockcypher',
  QUICKNODE = 'quicknode',
  ETHERSCAN = 'etherscan',
  ANKR = 'ankr',
  POCKET = 'pocket',
  CUSTOM = 'custom',
  LOCAL = 'local'
}
