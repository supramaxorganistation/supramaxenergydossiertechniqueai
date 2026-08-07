import type { Dossier, User, ComplianceReport } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function fileUrl(path: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path}`;
}

let token: string | null = localStorage.getItem('token');

export function setToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem('token', newToken);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken() {
  return token;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const data = await response.json();
      if (data.message) message = data.message;
    } catch {
      /* body non JSON */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function requestBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw new ApiError(`Erreur ${response.status}`, response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : 'dossier.pdf';
  return { blob, filename };
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, role?: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
  me: () => request<{ user: User }>('/me'),

  // Dossiers
  listDossiers: () => request<Dossier[]>('/api/dossiers'),
  getDossier: (id: string) => request<Dossier>(`/api/dossiers/${id}`),
  createDossier: (payload: Partial<Dossier>) =>
    request<Dossier>('/api/dossiers', { method: 'POST', body: JSON.stringify(payload) }),
  updateDossier: (id: string, payload: Record<string, unknown>) =>
    request<Dossier>(`/api/dossiers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDossier: (id: string) =>
    request<{ message: string }>(`/api/dossiers/${id}`, { method: 'DELETE' }),
  compliance: (id: string) => request<ComplianceReport>(`/api/dossiers/${id}/compliance`),
  exportPdf: (id: string) => requestBlob(`/api/dossiers/${id}/export-pdf`),

  uploadFile: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ message: string }>(`/api/dossiers/${id}/upload`, {
      method: 'POST',
      headers: {},
      body: form,
    });
  },
  deleteDocument: (id: string, index: number) =>
    request<{ message: string }>(`/api/dossiers/${id}/documents/${index}`, { method: 'DELETE' }),

  scanDatasheet: (id: string, file: File, cableType?: string) => {
    const form = new FormData();
    form.append('datasheet', file);
    const params = cableType ? `?cableType=${cableType}` : '';
    return request<{ message: string; scannedData: any; dossier: Dossier }>(
      `/api/dossiers/${id}/scan-equipment${params}`,
      { method: 'POST', headers: {}, body: form }
    );
  },

  // Users (admin)
  listUsers: () => request<User[]>('/api/users'),
  createUser: (name: string, email: string, password: string, role: string) =>
    request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
  updateUserRole: (id: string, role: string) =>
    request<User>(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
};
