import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { decoratorMetadata: true },
          target: 'es2021',
        },
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  // Each spec file gets its own worker so in-memory throttler state is isolated
  maxWorkers: 1,
  testTimeout: 30000,
  verbose: true,
};

export default config;
