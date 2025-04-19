/**
 * Jest configuration for TypeScript and path aliases.
 */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  setupFilesAfterEnv: [],
};
