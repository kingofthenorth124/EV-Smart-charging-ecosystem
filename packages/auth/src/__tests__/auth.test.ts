import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isAdminRole,
  isCustomerRole,
  ROLE_PERMISSIONS,
  USER_ROLES,
} from "../index";
import type { UserRole, Permission } from "../index";

describe("USER_ROLES", () => {
  it("maps every role to itself", () => {
    const roles: UserRole[] = [
      "CUSTOMER",
      "ADMIN_OFFICER",
      "SUPER_ADMIN",
      "OPERATIONS",
      "SUPPORT",
      "FINANCE",
      "TECHNICAL",
      "DEVELOPER",
    ];
    for (const role of roles) {
      expect(USER_ROLES[role]).toBe(role);
    }
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("every role has an entry", () => {
    const roles: UserRole[] = [
      "CUSTOMER",
      "ADMIN_OFFICER",
      "SUPER_ADMIN",
      "OPERATIONS",
      "SUPPORT",
      "FINANCE",
      "TECHNICAL",
      "DEVELOPER",
    ];
    for (const role of roles) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it("SUPER_ADMIN has all permissions", () => {
    const allPermissions: Permission[] = [
      "wallet:read",
      "wallet:topup",
      "sessions:read",
      "sessions:authorize",
      "sessions:stop",
      "nfc:read",
      "nfc:manage",
      "stations:read",
      "admin:customers",
      "admin:stations",
      "admin:config",
      "developer:portal",
    ];
    for (const perm of allPermissions) {
      expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain(perm);
    }
  });

  it("CUSTOMER cannot access admin permissions", () => {
    expect(ROLE_PERMISSIONS.CUSTOMER).not.toContain("admin:customers");
    expect(ROLE_PERMISSIONS.CUSTOMER).not.toContain("admin:stations");
    expect(ROLE_PERMISSIONS.CUSTOMER).not.toContain("admin:config");
  });
});

describe("hasPermission", () => {
  it("returns true for a permission the role has", () => {
    expect(hasPermission("CUSTOMER", "wallet:read")).toBe(true);
  });

  it("returns false for a permission the role lacks", () => {
    expect(hasPermission("CUSTOMER", "admin:customers")).toBe(false);
  });

  it("ADMIN_OFFICER can manage customers but not configure the platform", () => {
    expect(hasPermission("ADMIN_OFFICER", "admin:customers")).toBe(true);
    expect(hasPermission("ADMIN_OFFICER", "admin:config")).toBe(false);
  });

  it("FINANCE can only read wallets", () => {
    expect(hasPermission("FINANCE", "wallet:read")).toBe(true);
    expect(hasPermission("FINANCE", "wallet:topup")).toBe(false);
  });
});

describe("isAdminRole", () => {
  it("returns true for SUPER_ADMIN and ADMIN_OFFICER", () => {
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("ADMIN_OFFICER")).toBe(true);
  });

  it("returns false for non-admin roles", () => {
    expect(isAdminRole("CUSTOMER")).toBe(false);
    expect(isAdminRole("FINANCE")).toBe(false);
  });
});

describe("isCustomerRole", () => {
  it("returns true only for CUSTOMER", () => {
    expect(isCustomerRole("CUSTOMER")).toBe(true);
    expect(isCustomerRole("ADMIN_OFFICER")).toBe(false);
  });
});
