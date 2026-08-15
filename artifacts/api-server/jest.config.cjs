// @ts-check
'use strict';

const path = require('path');

/** @type {import('jest').Config} */
const config = {
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
  // Pin to an absolute path so jest-config always resolves the 30.x version
  // installed in this package — not the jest-environment-node@29.7.0 that
  // react-native pulls into the pnpm hoisted store, which lacks the
  // clearMocksOnScope() method required by jest-runtime@30.4.2.
  testEnvironment: path.resolve(__dirname, 'node_modules', 'jest-environment-node'),
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

module.exports = config;
