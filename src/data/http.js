// Minimal JSON fetch wrapper for the API.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let getToken = () => null;
let onUnauthorized = () => {};

/** Wired up by auth.js (avoids a circular import). */
export function configureHttp({ tokenProvider, unauthorizedHandler }) {
  getToken = tokenProvider;
  onUnauthorized = unauthorizedHandler;
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(data.error ?? `Something went wrong (${res.status})`, res.status);
  }
  return data;
}
