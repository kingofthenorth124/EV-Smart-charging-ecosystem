// @ts-check
"use strict";

const path = require("path");

/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ["js", "json", "ts"],

  rootDir: "src",

  testRegex: ".*\\.integration\\.spec\\.ts$",

  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            decoratorMetadata: true,
          },
          target: "es2021",
        },
      },
    ],
  },

  collectCoverageFrom: ["**/*.(t|j)s"],

  // Pin to the Jest environment installed by this package.
  testEnvironment: path.resolve(
    __dirname,
    "node_modules",
    "jest-environment-node",
  ),

  setupFiles: ["<rootDir>/test/jest.setup.ts"],

  // Jest does not understand the workspace export condition used by
  // @workspace/auth, so resolve it directly to the package source.
  moduleNameMapper: {
    "^@workspace/auth$": path.resolve(
      __dirname,
      "../../packages/auth/src/index.ts",
    ),
  },

  // Each spec file gets its own worker so in-memory throttler state is isolated.
  maxWorkers: 1,

  testTimeout: 30000,

  verbose: true,

  // Allow async handles to drain naturally before Jest force-exits.
  openHandlesTimeout: 3000,
};

module.exports = config;
