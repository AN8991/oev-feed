/** @type {import('ts-jest').JestConfigWithTsJest} */
export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
};
export const setupFilesAfterEnv = ['<rootDir>/jest.setup.js'];
export const testMatch = ['**/__tests__/**/*.test.ts'];
export const transform = {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: 'tsconfig.json',
  }],
};
export const moduleFileExtensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'node'];
export const collectCoverage = true;
export const coverageDirectory = 'coverage';
export const coverageReporters = ['text', 'lcov'];
export const coveragePathIgnorePatterns = [
  '/node_modules/',
  '/__tests__/',
];
