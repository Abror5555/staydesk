'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';

/**
 * Load data from the API for a page.
 * Returns { data, error, loading, reload }.
 *
 * - `loading` is derived (the last finished request is not the current one),
 *   so no state is set synchronously inside the effect.
 * - Previous data stays visible while the next request runs (no flicker).
 * - A newer request aborts the older one, so fast filter changes can never
 *   show stale results.
 */
export function useApi(path) {
  const [version, setVersion] = useState(0);
  const requestKey = path ? `${path}#${version}` : null;
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    apiRequest(path, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult((prev) => ({ key: requestKey, data: prev.data, error }));
        }
      });
    return () => controller.abort();
  }, [path, requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = Boolean(requestKey) && result.key !== requestKey;

  return { data: result.data, error: loading ? null : result.error, loading, reload };
}
