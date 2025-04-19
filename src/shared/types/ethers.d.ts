/**
 * Type definitions for ethers.js library
 * 
 * Part of the shared layer in hexagonal architecture
 * Contains type definitions that are used across multiple layers
 */

declare module 'ethers' {
  export * from '@ethersproject/providers';
  export * from '@ethersproject/contracts';
  export * from '@ethersproject/abstract-provider';
  export * from '@ethersproject/abstract-signer';
  export * from '@ethersproject/wallet';
  export * from '@ethersproject/bignumber';
  
  export class JsonRpcProvider {
    constructor(url: string, network?: any);
    getBalance(address: string): Promise<bigint>;
    getCode(address: string): Promise<string>;
    getStorageAt(address: string, position: string): Promise<string>;
    getTransactionCount(address: string): Promise<number>;
    call(transaction: any): Promise<string>;
    estimateGas(transaction: any): Promise<bigint>;
    getBlock(blockHashOrBlockTag: string | number): Promise<any>;
    getBlockNumber(): Promise<number>;
    getGasPrice(): Promise<bigint>;
    getNetwork(): Promise<any>;
    getTransaction(transactionHash: string): Promise<any>;
    getTransactionReceipt(transactionHash: string): Promise<any>;
    waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<any>;
  }
  
  export class Contract {
    constructor(address: string, abi: any[], providerOrSigner: any);
    connect(providerOrSigner: any): Contract;
    attach(address: string): Contract;
    deployed(): Promise<Contract>;
    interface: any;
    functions: any;
    callStatic: any;
    estimateGas: any;
    populateTransaction: any;
    filters: any;
    [key: string]: any;
  }
  
  export type Provider = any;
}
