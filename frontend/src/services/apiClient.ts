// Centralized API Client with standard error handling, session cookies, and dynamic baseURL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : 'http://127.0.0.1:8000/api')).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
let csrfReady: Promise<void> | null = null;

export const apiUrl = (endpoint: string) =>
  `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

export const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function ensureCsrfCookie(): Promise<void> {
  if (getCookie('csrftoken')) return;
  if (!csrfReady) {
    csrfReady = fetch(apiUrl('/auth/csrf/'), {
      credentials: 'include',
    }).then((response) => {
      if (!response.ok) throw new Error('Unable to start the secure session.');
    }).catch((error) => {
      csrfReady = null;
      if (error instanceof TypeError) {
        throw new Error('Cannot connect to the backend server. Please make sure it is running on port 8000.');
      }
      throw error;
    });
  }
  await csrfReady;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const csrftoken = getCookie('csrftoken');
  if (csrftoken && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', csrftoken);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      
      let message = errorData.error || errorData.detail || errorData.message;
      if (!message) {
        if (typeof errorData === 'object' && errorData !== null) {
          const parts: string[] = [];
          for (const [key, value] of Object.entries(errorData)) {
            if (key === 'receipt' || key === 'on_chain_data' || typeof value === 'object') continue;
            parts.push(String(value));
          }
          message = parts.filter(Boolean).join('. ');
        }
      }
      const error = new Error(message || 'An unexpected error occurred') as Error & { status?: number; data?: any };
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    if (response.status === 204) return {} as T;

    return response.json();
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS} ms.`);
    if (error instanceof TypeError) {
      throw new Error('Cannot connect to the backend server. Please make sure it is running on port 8000.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
