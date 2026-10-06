import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from '../config';

/** A file reference for multipart uploads in React Native (uri-based, not a browser File). */
export type RnFile = { uri: string; name: string; type: string };

/** In-memory auth token, kept in sync with persisted storage by AuthContext. */
let token: string | null = null;
export function setAuthToken(t: string | null) {
  token = t;
}
export function getAuthToken() {
  return token;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Build a multipart FormData from plain fields and RN file references. */
export function buildFormData(fields: Record<string, any> = {}, files: Record<string, RnFile> = {}): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v as any);
  });
  Object.entries(files).forEach(([k, f]) => fd.append(k, f as any));
  return fd;
}

/** JSON/multipart request mirroring the web api client. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body != null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers } as any);
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez la connexion et l\u2019URL du backend.', 0);
  }

  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const data = await response.json();
      if (data.message) message = data.message;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Download an authenticated binary (PDF/DOCX/image) to the app document directory.
 * Returns the local file uri (replaces the web's response.blob() flow).
 */
export async function downloadFile(path: string, filename: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const result = await FileSystem.downloadAsync(`${BASE_URL}${path}`, `${FileSystem.documentDirectory}${filename}`, {
    headers,
  });
  return result.uri;
}
