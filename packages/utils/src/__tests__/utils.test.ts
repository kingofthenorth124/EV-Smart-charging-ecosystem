import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  truncate,
  maskCardId,
  generateIdempotencyKey,
  parseQuery,
} from '../index';

describe('formatDate', () => {
  it('formats a Date object to a readable string', () => {
    const result = formatDate(new Date('2026-01-15T00:00:00Z'));
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2026-08-01T12:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDateTime', () => {
  it('includes time in the output', () => {
    const result = formatDateTime(new Date('2026-06-15T14:30:00Z'));
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatDuration', () => {
  it('formats seconds as Mm Ss when under an hour', () => {
    expect(formatDuration(90)).toBe('1m 30s');
  });

  it('formats seconds as Hh Mm when an hour or more', () => {
    expect(formatDuration(3661)).toBe('1h 1m');
  });

  it('handles zero seconds', () => {
    expect(formatDuration(0)).toBe('0m 0s');
  });

  it('handles exactly 3600 seconds as 1h 0m', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when short enough', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when too long', () => {
    const result = truncate('hello world', 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles maxLength equal to string length', () => {
    expect(truncate('abcde', 5)).toBe('abcde');
  });
});

describe('maskCardId', () => {
  it('masks all but the last 4 characters', () => {
    expect(maskCardId('ABCD1234')).toBe('****1234');
  });

  it('returns the identifier unchanged when it is 4 chars or fewer', () => {
    expect(maskCardId('1234')).toBe('1234');
    expect(maskCardId('AB')).toBe('AB');
  });
});

describe('generateIdempotencyKey', () => {
  it('returns a string containing the prefix', () => {
    const key = generateIdempotencyKey('topup');
    expect(key.startsWith('topup-')).toBe(true);
  });

  it('generates unique keys on successive calls', () => {
    const a = generateIdempotencyKey('test');
    const b = generateIdempotencyKey('test');
    expect(a).not.toBe(b);
  });
});

describe('parseQuery', () => {
  it('parses a simple query string', () => {
    const result = parseQuery('?page=2&limit=20');
    expect(result).toEqual({ page: '2', limit: '20' });
  });

  it('handles empty query string', () => {
    expect(parseQuery('')).toEqual({});
  });

  it('handles query string without leading ?', () => {
    const result = parseQuery('foo=bar');
    expect(result).toEqual({ foo: 'bar' });
  });
});
