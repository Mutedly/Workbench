import type { Shift, ShiftDraft, User, Workbench } from './types';

const TOKEN_KEY = 'workbench_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (!path.startsWith('/auth')) window.location.assign('/login');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/auth/me'),
  forgot: (email: string) =>
    request<{ ok: boolean; devCode?: string }>('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  reset: (email: string, code: string, password: string) =>
    request<{ token: string; user: User }>('/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, password }),
    }),

  listWorkbenches: () => request<Workbench[]>('/workbenches'),
  getWorkbench: (id: number) => request<Workbench>(`/workbenches/${id}`),
  createWorkbench: (data: Partial<Workbench>) =>
    request<Workbench>('/workbenches', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkbench: (id: number, data: Partial<Workbench>) =>
    request<Workbench>(`/workbenches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkbench: (id: number) =>
    request<{ ok: boolean }>(`/workbenches/${id}`, { method: 'DELETE' }),

  listShifts: (wbId: number) => request<Shift[]>(`/workbenches/${wbId}/shifts`),
  createShift: (wbId: number, data: ShiftDraft) =>
    request<Shift>(`/workbenches/${wbId}/shifts`, { method: 'POST', body: JSON.stringify(data) }),
  createShifts: (wbId: number, data: ShiftDraft[]) =>
    request<Shift[]>(`/workbenches/${wbId}/shifts`, { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (wbId: number, id: number, data: ShiftDraft) =>
    request<Shift>(`/workbenches/${wbId}/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (wbId: number, id: number) =>
    request<{ ok: boolean }>(`/workbenches/${wbId}/shifts/${id}`, { method: 'DELETE' }),

  exportUrl: (wbId: number) => `/api/workbenches/${wbId}/export.csv`,
};
