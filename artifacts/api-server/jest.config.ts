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
  // Allow up to 3 s for async handles (pg pool sockets) to drain naturally
  // before Jest force-exits. With allowExitOnIdle:true on the Pool this
  // should never be reached, but it acts as a belt-and-suspenders safety net.
  openHandlesTimeout: 3000,
};

export default config;
