#!/usr/bin/env node
/**
 * Custom Prisma generate postinstall for pnpm monorepos.
 *
 * Problem: Prisma v7 resolves @prisma/client via Node.js module resolution
 * starting from the schema file's directory. When the schema lives in
 * `prisma/schema.prisma` (workspace root), there is no @prisma/client there.
 *
 * Solution: Copy the schema into the api-server package directory (where
 * @prisma/client IS installed), run prisma generate against the local copy,
 * then delete the copy.
 */

const { execSync } = require("child_process");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const { resolve } = require("path");

const cwd = __dirname;
const schemaSource = resolve(cwd, "../../prisma/schema.prisma");
const tempSchema = resolve(cwd, ".schema-gen-temp.prisma");

// Copy schema, stripping any hardcoded output= lines (pnpm handles resolution)
const schema = readFileSync(schemaSource, "utf8");
const cleaned = schema
  .split("\n")
  .filter((line) => !line.match(/^\s*output\s*=/))
  .join("\n");

writeFileSync(tempSchema, cleaned);

try {
  execSync(`node_modules/.bin/prisma generate --schema=${tempSchema}`, {
    stdio: "inherit",
    cwd,
  });
} finally {
  try {
    unlinkSync(tempSchema);
  } catch {
    /* ignore */
  }
}
