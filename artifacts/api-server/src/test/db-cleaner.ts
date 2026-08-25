/**
 * Targeted test-data cleanup.
 * Deletes rows created by test fixtures without touching unrelated data.
 * Cascading FK constraints handle child rows automatically (refreshTokens, etc.).
 */
import { PrismaService } from "../modules/database/prisma.service";

export async function cleanupTestUsers(
  prisma: PrismaService,
  emails: string[],
): Promise<void> {
  if (emails.length === 0) return;
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

/** Generate a unique test email to avoid collisions across parallel test runs. */
export function uniqueEmail(label: string): string {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return `test-${label}-${stamp}-${rand}@cameltest.invalid`;
}

/** Generate a unique test phone that passes the regex /^\+?[0-9\s\-()]{10,20}$/ */
export function uniquePhone(): string {
  const digits = String(Date.now()).slice(-9); // 9 digits
  return `+1555${digits}`.slice(0, 15);
}
