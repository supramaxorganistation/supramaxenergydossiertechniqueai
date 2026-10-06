import * as FileSystem from 'expo-file-system/legacy';
import type { Dossier, User, ComplianceReport, CatalogEquipment, TemplateVariable, ChatMessage } from '../types';
import { request, downloadFile, buildFormData, type RnFile } from './http';

export { fileUrl } from '../config';

export const api = {
  // Auth
  login: (email: string, password: string, recaptchaToken?: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, recaptchaToken }),
    }),
  register: (name: string, email: string, password: string, role?: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
  me: () => request<{ user: User }>('/me'),
  faceLogin: (descriptor: number[]) =>
    request<{ token: string; user: User }>('/auth/face-login', {
      method: 'POST',
      body: JSON.stringify({ descriptor }),
    }),
  faceRegister: (userId: string | undefined, descriptor: number[]) =>
    request<{ message: string; hasFace: boolean }>('/auth/face-register', {
      method: 'POST',
      body: JSON.stringify({ userId, descriptor }),
    }),

  // Forgot / reset password
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

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

  // Exports: download to the app document directory and return the local uri.
  exportPdf: async (id: string): Promise<string> => {
    const disposition = await downloadFile(`/api/dossiers/${id}/export-pdf`, `dossier-${id}.pdf`);
    return disposition;
  },
  exportDocx: async (id: string): Promise<string> =>
    downloadFile(`/api/dossiers/${id}/export-docx`, `dossier-${id}.docx`),

  // Template variables ({{placeholders}} of the DOCX template)
  templateVariables: () => request<TemplateVariable[]>('/api/dossiers/template-variables'),
  aiTexts: (id: string) =>
    request<{ texts: Record<string, string> }>(`/api/dossiers/${id}/ai-texts`, { method: 'POST' }),

  // AI assistant agent (chatbot with database access)
  chat: (id: string, message: string, images?: { mimeType: string; base64: string }[]) =>
    request<{
      reply: string;
      actions: { tool: string; note?: string }[];
      fallback: boolean;
      history: ChatMessage[];
    }>(`/api/dossiers/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, images: images || [] }),
    }),

  // Document upload
  uploadFile: (id: string, file: RnFile) =>
    request<{ message: string }>(`/api/dossiers/${id}/upload`, {
      method: 'POST',
      body: buildFormData({}, { file }),
    }),
  deleteDocument: (id: string, index: number) =>
    request<{ message: string }>(`/api/dossiers/${id}/documents/${index}`, { method: 'DELETE' }),

  scanDatasheet: (id: string, file: RnFile, cableType?: string) => {
    const params = cableType ? `?cableType=${cableType}` : '';
    return request<{ message: string; scannedData: any; dossier: Dossier }>(
      `/api/dossiers/${id}/scan-equipment${params}`,
      { method: 'POST', body: buildFormData({}, { datasheet: file }) }
    );
  },

  // Equipment catalog
  scanEquipment: (file: RnFile, cableType?: 'AC' | 'DC') =>
    request<{ message: string; equipment: CatalogEquipment; scannedData: any }>(
      '/api/equipment/scan',
      { method: 'POST', body: buildFormData(cableType ? { cableType } : {}, { datasheet: file }) }
    ),
  listEquipment: () => request<CatalogEquipment[]>('/api/equipment'),
  deleteEquipment: (id: string) =>
    request<{ message: string }>(`/api/equipment/${id}`, { method: 'DELETE' }),

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

/** Re-exported for callers that need the low-level file download (images, branding). */
export const downloadTo = (path: string, filename: string) => downloadFile(path, filename);
export const documentDirectory = FileSystem.documentDirectory;
