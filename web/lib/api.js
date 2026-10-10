export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/** Error thrown for any failed API call. `fields` maps form field -> message. */
export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Build a query string, skipping empty values: toQuery({a: 1, b: ''}) -> '?a=1' */
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Small fetch wrapper used by every page.
 * - sends/receives JSON
 * - turns the API error format { error: { code, message, details } } into ApiError
 * - turns network failures into a readable message
 */
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Please check that the API is running.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data && data.error) || {};
    throw new ApiError(
      response.status,
      error.code || 'HTTP_ERROR',
      error.message || `Request failed with status ${response.status}`,
      error.details || {},
    );
  }
  return data;
}
