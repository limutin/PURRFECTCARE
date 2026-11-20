import { getFunctionUrl, publicAnonKey } from './supabase/info';

/** Error thrown by `api()`; `status` is the HTTP status, `data` the parsed JSON body. */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Calls the clinic edge function and returns parsed JSON.
 * Throws ApiError with the server's `error` message on non-2xx responses.
 *
 *   const { pets } = await api('/pets', accessToken);
 *   await api('/services', accessToken, { method: 'POST', body: { name, price } });
 */
export async function api<T = any>(
  path: string,
  accessToken: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(getFunctionUrl(path), {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': publicAnonKey,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  return data as T;
}

/** Reads a Blob as base64 (without the data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Peso formatting used across the app. */
export const peso = (n: number | string | null | undefined) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
