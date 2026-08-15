import { describe, it, expect } from 'vitest';
import { AUDIT_ACTIONS, PLATFORM_EVENTS } from '../index';
import type {
  UserRole,
  UserStatus,
  WalletStatus,
  TransactionType,
  SessionStatus,
  StationStatus,
  PlatformEventType,
  EventEnvelope,
} from '../index';

describe('AUDIT_ACTIONS', () => {
  it('every key equals its value (constant identity)', () => {
    for (const [key, value] of Object.entries(AUDIT_ACTIONS)) {
      expect(key).toBe(value);
    }
  });

  it('contains all expected Module 1 events', () => {
    expect(AUDIT_ACTIONS.USER_REGISTERED).toBe('USER_REGISTERED');
    expect(AUDIT_ACTIONS.USER_LOGIN_SUCCESS).toBe('USER_LOGIN_SUCCESS');
    expect(AUDIT_ACTIONS.USER_LOGOUT).toBe('USER_LOGOUT');
    expect(AUDIT_ACTIONS.USER_PASSWORD_RESET_COMPLETED).toBe('USER_PASSWORD_RESET_COMPLETED');
  });
});

describe('PLATFORM_EVENTS', () => {
  it('wallet events are dot-namespaced strings', () => {
    expect(PLATFORM_EVENTS.WALLET_CREATED).toBe('wallet.created');
    expect(PLATFORM_EVENTS.WALLET_TOPPED_UP).toBe('wallet.topped_up');
  });

  it('session events are dot-namespaced strings', () => {
    expect(PLATFORM_EVENTS.SESSION_STARTED).toBe('session.started');
    expect(PLATFORM_EVENTS.SESSION_STOPPED).toBe('session.stopped');
  });
});

describe('type guards (compile-time shape tests)', () => {
  it('UserRole type accepts all defined roles', () => {
    const roles: UserRole[] = [
      'CUSTOMER', 'ADMIN_OFFICER', 'SUPER_ADMIN',
      'OPERATIONS', 'SUPPORT', 'FINANCE', 'TECHNICAL', 'DEVELOPER',
    ];
    expect(roles.length).toBe(8);
  });

  it('UserStatus type accepts all defined statuses', () => {
    const statuses: UserStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
    expect(statuses.length).toBe(4);
  });

  it('WalletStatus type accepts all defined statuses', () => {
    const statuses: WalletStatus[] = ['ACTIVE', 'SUSPENDED', 'FROZEN'];
    expect(statuses.length).toBe(3);
  });

  it('TransactionType covers all operations', () => {
    const types: TransactionType[] = ['TOP_UP', 'CHARGE', 'REFUND', 'ADJUSTMENT'];
    expect(types.length).toBe(4);
  });

  it('SessionStatus covers all session states', () => {
    const statuses: SessionStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED'];
    expect(statuses.length).toBe(4);
  });

  it('StationStatus covers all station states', () => {
    const statuses: StationStatus[] = ['AVAILABLE', 'BUSY', 'OFFLINE', 'MAINTENANCE'];
    expect(statuses.length).toBe(4);
  });

  it('EventEnvelope can be constructed with typed payload', () => {
    const event: EventEnvelope<{ userId: string }> = {
      id: 'evt-001',
      type: 'wallet.topped_up',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      source: 'wallet-service',
      correlationId: 'corr-001',
      payload: { userId: 'user-001' },
    };
    expect(event.type).toBe('wallet.topped_up');
    expect(event.payload.userId).toBe('user-001');
  });
});
