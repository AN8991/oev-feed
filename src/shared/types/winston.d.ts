/**
 * Type definitions for winston logger
 * 
 * Part of the shared layer in hexagonal architecture
 * Contains type definitions for the logging system used across multiple layers
 */

declare module 'winston' {
  export interface LoggerOptions {
    level?: string;
    format?: any;
    defaultMeta?: any;
    transports?: any[];
    exitOnError?: boolean;
    silent?: boolean;
  }

  export interface Logger {
    log(level: string, message: string, ...meta: any[]): Logger;
    error(message: string, ...meta: any[]): Logger;
    warn(message: string, ...meta: any[]): Logger;
    info(message: string, ...meta: any[]): Logger;
    debug(message: string, ...meta: any[]): Logger;
    verbose(message: string, ...meta: any[]): Logger;
    silly(message: string, ...meta: any[]): Logger;
  }

  export function createLogger(options: LoggerOptions): Logger;

  export namespace format {
    function combine(...formats: any[]): any;
    function timestamp(options?: any): any;
    function printf(templateFunction: (info: any) => string): any;
    function colorize(options?: any): any;
    function json(options?: any): any;
    function simple(): any;
    function label(options: any): any;
    function splat(): any;
    function errors(options?: any): any;
    function prettyPrint(options?: any): any;
    function metadata(options?: any): any;
  }

  export namespace transports {
    class Console {
      constructor(options?: any);
    }
    class File {
      constructor(options?: any);
    }
    class Stream {
      constructor(options?: any);
    }
  }
}
