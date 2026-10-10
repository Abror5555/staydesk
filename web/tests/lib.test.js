import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, apiRequest, toQuery } from '../lib/api';
import { formatDate, formatMoney, nightsBetween } from '../lib/format';

afterEach(() => vi.unstubAllGlobals());

describe('toQuery', () => {
  test('skips empty values', () => {
    expect(toQuery({ status: 'confirmed', search: '', page: 2, x: undefined })).toBe('?status=confirmed&page=2');
    expect(toQuery({})).toBe('');
  });
});

describe('apiRequest', () => {
  test('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
    await expect(apiRequest('/rooms')).resolves.toEqual({ id: 1 });
  });

  test('turns the API error format into ApiError with field errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { code: 'VALIDATION_ERROR', message: 'Check fields', details: { 'guest.email': 'Invalid email' } },
          }),
      }),
    );
    const error = await apiRequest('/reservations', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: { 'guest.email': 'Invalid email' } });
  });

  test('reports a readable message when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await apiRequest('/rooms').catch((e) => e);
    expect(error.code).toBe('NETWORK_ERROR');
  });
});

describe('formatting', () => {
  test('formats money and dates without time zone shifts', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatDate('2030-05-01')).toBe('May 1, 2030');
    expect(nightsBetween('2030-05-10', '2030-05-13')).toBe(3);
  });
});
