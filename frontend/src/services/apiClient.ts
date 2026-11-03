// Centralized API Client with standard error handling, session cookies, and dynamic baseURL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : '')).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000);
let csrfReady: Promise<void> | null = null;
let csrfToken: string | null = null;

export const apiUrl = (endpoint: string) => {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL must point to the production LightVote API.');
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function ensureCsrfCookie(): Promise<void> {
  csrfReady = fetch(apiUrl('/auth/csrf/'), { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Unable to start the secure session.');
      const data = await response.json();
      csrfToken = data.csrf_token || getCookie('csrftoken');
      if (!csrfToken) throw new Error('The backend did not provide a CSRF token.');
    })
    .catch((error) => {
      if (error instanceof TypeError) {
        throw new Error('Cannot connect to the backend server. Please make sure it is running on port 8000.');
      }
      throw error;
    });
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

  const csrftoken = csrfToken || getCookie('csrftoken');
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

    const data = await response.json();
    if (data?.csrf_token) csrfToken = data.csrf_token;
    return data;
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

export async function apiRequestAllPages<T = any>(endpoint: string): Promise<T[]> {
  const firstUrl = new URL(apiUrl(endpoint));
  firstUrl.searchParams.set('page_size', '200');
  const apiBase = new URL(API_BASE_URL);
  const apiPath = apiBase.pathname.replace(/\/$/, '');
  const rows: T[] = [];
  const visited = new Set<string>();
  let next: string | null = `${firstUrl.pathname}${firstUrl.search}`;

  while (next) {
    const requestUrl = new URL(next, apiBase);
    if (requestUrl.origin !== apiBase.origin || !requestUrl.pathname.startsWith(`${apiPath}/`)) {
      throw new Error('The backend returned a pagination link outside the configured API.');
    }
    const key = `${requestUrl.pathname}${requestUrl.search}`;
    if (visited.has(key)) throw new Error('The backend returned a repeated pagination link.');
    visited.add(key);

    const endpointPath = requestUrl.pathname.slice(apiPath.length) + requestUrl.search;
    const page = await apiRequest<any>(endpointPath);
    if (Array.isArray(page)) return rows.concat(page);
    if (!Array.isArray(page?.results)) throw new Error('The backend returned an invalid paginated response.');
    rows.push(...page.results as T[]);
    next = page.next || null;
  }
  return rows;
}
