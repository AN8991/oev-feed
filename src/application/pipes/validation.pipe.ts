/**
 * Custom Validation Pipes with Enhanced Error Messages
 * These pipes provide detailed validation feedback for better API usability
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Enhanced Validation Pipe with detailed error messages
 */
@Injectable()
export class DetailedValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        statusCode: 400,
        error: 'Bad Request',
        details: formattedErrors,
        timestamp: new Date().toISOString()
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): any {
    const formattedErrors: any = {};

    errors.forEach(error => {
      const property = error.property;
      const constraints = error.constraints;
      
      if (constraints) {
        formattedErrors[property] = {
          value: error.value,
          errors: Object.values(constraints),
          children: error.children?.length > 0 ? this.formatChildrenErrors(error.children) : undefined
        };
      }
    });

    return formattedErrors;
  }

  private formatChildrenErrors(children: any[]): any {
    const childErrors: any = {};
    
    children.forEach(child => {
      if (child.constraints) {
        childErrors[child.property] = {
          value: child.value,
          errors: Object.values(child.constraints)
        };
      }
    });

    return childErrors;
  }
}

/**
 * Ethereum Address Validation Pipe
 */
@Injectable()
export class EthereumAddressPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException({
        message: 'Address is required',
        statusCode: 400,
        error: 'Bad Request',
        details: {
          address: {
            value: value,
            errors: ['Address cannot be empty']
          }
        }
      });
    }

    // Check basic format
    if (typeof value !== 'string') {
      throw new BadRequestException({
        message: 'Invalid address format',
        statusCode: 400,
        error: 'Bad Request',
        details: {
          address: {
            value: value,
            errors: ['Address must be a string']
          }
        }
      });
    }

    // Check Ethereum address format
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(value)) {
      throw new BadRequestException({
        message: 'Invalid Ethereum address format',
        statusCode: 400,
        error: 'Bad Request',
        details: {
          address: {
            value: value,
            errors: [
              'Address must be a valid 40-character hexadecimal string starting with 0x',
              'Example: 0x79682489385337996edd00eb56b4238b597bfae7'
            ]
          }
        }
      });
    }

    // Return normalized address (lowercase)
    return value.toLowerCase();
  }
}

/**
 * Pagination Validation Pipe
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: any): any {
    const result: any = {};

    // Validate page
    if (value.page !== undefined) {
      const page = parseInt(value.page);
      if (isNaN(page) || page < 1) {
        throw new BadRequestException({
          message: 'Invalid pagination parameters',
          statusCode: 400,
          error: 'Bad Request',
          details: {
            page: {
              value: value.page,
              errors: ['Page must be a positive integer starting from 1']
            }
          }
        });
      }
      result.page = page;
    } else {
      result.page = 1;
    }

    // Validate limit
    if (value.limit !== undefined) {
      const limit = parseInt(value.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException({
          message: 'Invalid pagination parameters',
          statusCode: 400,
          error: 'Bad Request',
          details: {
            limit: {
              value: value.limit,
              errors: ['Limit must be a positive integer between 1 and 100']
            }
          }
        });
      }
      result.limit = limit;
    } else {
      result.limit = 20;
    }

    return { ...value, ...result };
  }
}

/**
 * Array Size Validation Pipe
 */
@Injectable()
export class ArraySizePipe implements PipeTransform {
  constructor(
    private readonly minSize: number = 1,
    private readonly maxSize: number = 50,
    private readonly fieldName: string = 'array'
  ) {}

  transform(value: any[]): any[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException({
        message: `${this.fieldName} must be an array`,
        statusCode: 400,
        error: 'Bad Request',
        details: {
          [this.fieldName]: {
            value: value,
            errors: [`${this.fieldName} must be an array`]
          }
        }
      });
    }

    if (value.length < this.minSize) {
      throw new BadRequestException({
        message: `${this.fieldName} size validation failed`,
        statusCode: 400,
        error: 'Bad Request',
        details: {
          [this.fieldName]: {
            value: value,
            errors: [`${this.fieldName} must contain at least ${this.minSize} item(s)`]
          }
        }
      });
    }

    if (value.length > this.maxSize) {
      throw new BadRequestException({
        message: `${this.fieldName} size validation failed`,
        statusCode: 400,
        error: 'Bad Request',
        details: {
          [this.fieldName]: {
            value: value,
            errors: [`${this.fieldName} cannot contain more than ${this.maxSize} item(s)`]
          }
        }
      });
    }

    return value;
  }
}
