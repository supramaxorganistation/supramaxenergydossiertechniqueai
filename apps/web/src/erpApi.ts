import type {
  ErpCustomer, ErpSupplier, ErpProduct, ErpWarehouse,
  ErpSalesOrder, ErpPurchaseOrder, ErpInvoice, ErpPayment,
  ErpAccount, ErpJournalEntry, ErpStockMovement,
  ErpEmployee, ErpAttendance, ErpStats,
  ErpQuote, ErpSetting,
  ErpInstallation, InstallationListResponse, InstallationListParams,
  InstallationStats, InstallationMapPoint, InstallationEvent,
  ChecklistConfigResponse, ChecklistConfigItem
} from './erpTypes';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let getTokenFn: () => string | null;

export function initErpApi(getToken: () => string | null) {
  getTokenFn = getToken;
}

async function erpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body != null) headers['Content-Type'] = 'application/json';
  const token = getTokenFn?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try { const d = await response.json(); if (d.message) message = d.message; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const erpApi = {
  // Stats
  stats: () => erpRequest<ErpStats>('/erp/stats'),

  // Customers
  listCustomers: () => erpRequest<ErpCustomer[]>('/erp/customers'),
  getCustomer: (id: string) => erpRequest<ErpCustomer>(`/erp/customers/${id}`),
  createCustomer: (data: Partial<ErpCustomer>) =>
    erpRequest<ErpCustomer>('/erp/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<ErpCustomer>) =>
    erpRequest<ErpCustomer>(`/erp/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) =>
    erpRequest<{ message: string }>(`/erp/customers/${id}`, { method: 'DELETE' }),

  // Suppliers
  listSuppliers: () => erpRequest<ErpSupplier[]>('/erp/suppliers'),
  createSupplier: (data: Partial<ErpSupplier>) =>
    erpRequest<ErpSupplier>('/erp/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<ErpSupplier>) =>
    erpRequest<ErpSupplier>(`/erp/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) =>
    erpRequest<{ message: string }>(`/erp/suppliers/${id}`, { method: 'DELETE' }),

  // Products
  listProducts: () => erpRequest<ErpProduct[]>('/erp/products'),
  createProduct: (data: Partial<ErpProduct>) =>
    erpRequest<ErpProduct>('/erp/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<ErpProduct>) =>
    erpRequest<ErpProduct>(`/erp/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    erpRequest<{ message: string }>(`/erp/products/${id}`, { method: 'DELETE' }),

  // Warehouses
  listWarehouses: () => erpRequest<ErpWarehouse[]>('/erp/warehouses'),
  createWarehouse: (data: Partial<ErpWarehouse>) =>
    erpRequest<ErpWarehouse>('/erp/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: string, data: Partial<ErpWarehouse>) =>
    erpRequest<ErpWarehouse>(`/erp/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWarehouse: (id: string) =>
    erpRequest<{ message: string }>(`/erp/warehouses/${id}`, { method: 'DELETE' }),

  // Sales Orders
  listSalesOrders: () => erpRequest<ErpSalesOrder[]>('/erp/sales-orders'),
  createSalesOrder: (data: Partial<ErpSalesOrder>) =>
    erpRequest<ErpSalesOrder>('/erp/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: Partial<ErpSalesOrder>) =>
    erpRequest<ErpSalesOrder>(`/erp/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalesOrder: (id: string) =>
    erpRequest<{ message: string }>(`/erp/sales-orders/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  listPurchaseOrders: () => erpRequest<ErpPurchaseOrder[]>('/erp/purchase-orders'),
  createPurchaseOrder: (data: Partial<ErpPurchaseOrder>) =>
    erpRequest<ErpPurchaseOrder>('/erp/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: Partial<ErpPurchaseOrder>) =>
    erpRequest<ErpPurchaseOrder>(`/erp/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePurchaseOrder: (id: string) =>
    erpRequest<{ message: string }>(`/erp/purchase-orders/${id}`, { method: 'DELETE' }),

  // Invoices
  listInvoices: () => erpRequest<ErpInvoice[]>('/erp/invoices'),
  createInvoice: (data: Partial<ErpInvoice>) =>
    erpRequest<ErpInvoice>('/erp/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: Partial<ErpInvoice>) =>
    erpRequest<ErpInvoice>(`/erp/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) =>
    erpRequest<{ message: string }>(`/erp/invoices/${id}`, { method: 'DELETE' }),

  // Payments
  listPayments: () => erpRequest<ErpPayment[]>('/erp/payments'),
  createPayment: (data: Partial<ErpPayment>) =>
    erpRequest<ErpPayment>('/erp/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Accounts (Chart of Accounts)
  listAccounts: () => erpRequest<ErpAccount[]>('/erp/accounts'),
  createAccount: (data: Partial<ErpAccount>) =>
    erpRequest<ErpAccount>('/erp/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<ErpAccount>) =>
    erpRequest<ErpAccount>(`/erp/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  seedAccounts: () => erpRequest<{ message: string }>('/erp/accounts/seed', { method: 'POST' }),

  // Journal Entries
  listJournalEntries: () => erpRequest<ErpJournalEntry[]>('/erp/journal-entries'),
  createJournalEntry: (data: Partial<ErpJournalEntry>) =>
    erpRequest<ErpJournalEntry>('/erp/journal-entries', { method: 'POST', body: JSON.stringify(data) }),
  updateJournalEntry: (id: string, data: Partial<ErpJournalEntry>) =>
    erpRequest<ErpJournalEntry>(`/erp/journal-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Stock Movements
  listStockMovements: () => erpRequest<ErpStockMovement[]>('/erp/stock-movements'),
  createStockMovement: (data: Partial<ErpStockMovement>) =>
    erpRequest<ErpStockMovement>('/erp/stock-movements', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  listEmployees: () => erpRequest<ErpEmployee[]>('/erp/employees'),
  createEmployee: (data: Partial<ErpEmployee>) =>
    erpRequest<ErpEmployee>('/erp/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<ErpEmployee>) =>
    erpRequest<ErpEmployee>(`/erp/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    erpRequest<{ message: string }>(`/erp/employees/${id}`, { method: 'DELETE' }),

  // Attendance
  listAttendance: () => erpRequest<ErpAttendance[]>('/erp/attendance'),
  createAttendance: (data: Partial<ErpAttendance>) =>
    erpRequest<ErpAttendance>('/erp/attendance', { method: 'POST', body: JSON.stringify(data) }),
  updateAttendance: (id: string, data: Partial<ErpAttendance>) =>
    erpRequest<ErpAttendance>(`/erp/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Quotes
  listQuotes: () => erpRequest<ErpQuote[]>('/erp/quotes'),
  getQuote: (id: string) => erpRequest<ErpQuote>(`/erp/quotes/${id}`),
  createQuote: (data: Partial<ErpQuote>) =>
    erpRequest<ErpQuote>('/erp/quotes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuote: (id: string, data: Partial<ErpQuote>) =>
    erpRequest<ErpQuote>(`/erp/quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuote: (id: string) =>
    erpRequest<{ message: string }>(`/erp/quotes/${id}`, { method: 'DELETE' }),
  convertQuoteToInvoice: (id: string) =>
    erpRequest<{ message: string; invoice: ErpInvoice }>(`/erp/quotes/${id}/convert-to-invoice`, { method: 'POST' }),

  // Settings
  listSettings: () => erpRequest<ErpSetting[]>('/erp/settings'),
  getSettingsByCategory: (category: string) =>
    erpRequest<ErpSetting[]>(`/erp/settings/${category}`),
  updateSetting: (category: string, key: string, value: any) =>
    erpRequest<ErpSetting>(`/erp/settings/${category}/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  bulkUpdateSettings: (settings: { category: string; key: string; value: any; label?: string; description?: string; valueType?: string }[]) =>
    erpRequest<ErpSetting[]>('/erp/settings/bulk', { method: 'POST', body: JSON.stringify({ settings }) }),
  seedSettings: () => erpRequest<{ message: string }>('/erp/settings/seed', { method: 'POST' }),

  // Invoice overdue check
  checkOverdueInvoices: () => erpRequest<{ message: string; modified: number }>('/erp/invoices/check-overdue', { method: 'POST' }),

  // ============================================
  // INSTALLATIONS
  // ============================================
  listInstallations: (params: InstallationListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const s = qs.toString();
    return erpRequest<InstallationListResponse>(`/erp/installations${s ? `?${s}` : ''}`);
  },
  getInstallation: (id: string) => erpRequest<ErpInstallation>(`/erp/installations/${id}`),
  createInstallation: (data: Partial<ErpInstallation> & { lat?: number; lng?: number }) =>
    erpRequest<ErpInstallation>('/erp/installations', { method: 'POST', body: JSON.stringify(data) }),
  updateInstallation: (id: string, data: Partial<ErpInstallation> & { lat?: number; lng?: number }) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelInstallation: (id: string, reason: string) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  createInstallationFromQuote: (quoteId: string, data: Partial<ErpInstallation> = {}) =>
    erpRequest<ErpInstallation>(`/erp/installations/from-quote/${quoteId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Stage transitions
  startStage: (id: string, n: number) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/start`, { method: 'POST' }),
  completeStage: (id: string, n: number, opts: { reason?: string; adminOverride?: boolean } = {}) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/complete`, { method: 'POST', body: JSON.stringify(opts) }),
  blockStage: (id: string, n: number, reason: string) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/block`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unblockStage: (id: string, n: number) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/unblock`, { method: 'POST' }),
  updateChecklistItem: (id: string, n: number, key: string, data: { value?: string; isDone?: boolean }) =>
    erpRequest<{ stageNumber: number; code: string; checklist: unknown }>(
      `/erp/installations/${id}/stages/${n}/checklist/${key}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Read-only journal + aggregates
  getInstallationEvents: (id: string) => erpRequest<InstallationEvent[]>(`/erp/installations/${id}/events`),
  installationStats: () => erpRequest<InstallationStats>('/erp/installations/stats/summary'),
  installationMap: () => erpRequest<InstallationMapPoint[]>('/erp/installations/map'),

  // Stage media (multipart) — erpRequest skips JSON Content-Type for FormData
  uploadStagePhotos: (id: string, n: number, files: File[], meta: { checklistKey?: string; caption?: string; takenAt?: string; lat?: number; lng?: number } = {}) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('photos', f));
    if (meta.checklistKey) fd.append('checklistKey', meta.checklistKey);
    if (meta.caption) fd.append('caption', meta.caption);
    if (meta.takenAt) fd.append('takenAt', meta.takenAt);
    if (meta.lat != null) fd.append('lat', String(meta.lat));
    if (meta.lng != null) fd.append('lng', String(meta.lng));
    return erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/photos`, { method: 'POST', body: fd });
  },
  uploadStageDocument: (id: string, n: number, file: File, meta: { type?: string; checklistKey?: string } = {}) => {
    const fd = new FormData();
    fd.append('document', file);
    if (meta.type) fd.append('type', meta.type);
    if (meta.checklistKey) fd.append('checklistKey', meta.checklistKey);
    return erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/documents`, { method: 'POST', body: fd });
  },
  deleteStagePhoto: (id: string, n: number, photoId: string) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/photos/${photoId}`, { method: 'DELETE' }),
  deleteStageDocument: (id: string, n: number, docId: string) =>
    erpRequest<ErpInstallation>(`/erp/installations/${id}/stages/${n}/documents/${docId}`, { method: 'DELETE' }),

  // Checklist configuration (admin)
  getChecklistsConfig: () => erpRequest<ChecklistConfigResponse>('/erp/installations/config/checklists'),
  saveChecklistsConfig: (checklists: Record<string, ChecklistConfigItem[] | null>) =>
    erpRequest<ChecklistConfigResponse>('/erp/installations/config/checklists', {
      method: 'PUT', body: JSON.stringify({ checklists }),
    }),
};
