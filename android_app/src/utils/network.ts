/**
 * Shared network utilities to avoid duplication across services.
 */

export const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
};

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const { signal, clear } = createTimeoutSignal(10000);
  try {
    const response = await fetch(url, { ...(init || {}), signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clear();
  }
};
