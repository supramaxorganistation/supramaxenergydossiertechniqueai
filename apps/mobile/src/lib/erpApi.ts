import type {
  ErpCustomer, ErpSupplier, ErpProduct, ErpWarehouse,
  ErpSalesOrder, ErpPurchaseOrder, ErpInvoice, ErpPayment,
  ErpAccount, ErpJournalEntry, ErpStockMovement,
  ErpEmployee, ErpAttendance, ErpStats,
  ErpQuote, ErpSetting,
  ErpInstallation, InstallationListResponse, InstallationListParams,
  InstallationStats, InstallationMapPoint, InstallationEvent,
  ChecklistConfigResponse, ChecklistConfigItem,
} from '../erpTypes';
import { request, buildFormData, type RnFile } from './http';

export const erpApi = {
  // Stats
  stats: () => request<ErpStats>('/erp/stats'),

  // Customers
  listCustomers: () => request<ErpCustomer[]>('/erp/customers'),
  getCustomer: (id: string) => request<ErpCustomer>(`/erp/customers/${id}`),
  createCustomer: (data: Partial<ErpCustomer>) =>
    request<ErpCustomer>('/erp/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<ErpCustomer>) =>
    request<ErpCustomer>(`/erp/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) =>
    request<{ message: string }>(`/erp/customers/${id}`, { method: 'DELETE' }),

  // Suppliers
  listSuppliers: () => request<ErpSupplier[]>('/erp/suppliers'),
  createSupplier: (data: Partial<ErpSupplier>) =>
    request<ErpSupplier>('/erp/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<ErpSupplier>) =>
    request<ErpSupplier>(`/erp/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) =>
    request<{ message: string }>(`/erp/suppliers/${id}`, { method: 'DELETE' }),

  // Products
  listProducts: () => request<ErpProduct[]>('/erp/products'),
  createProduct: (data: Partial<ErpProduct>) =>
    request<ErpProduct>('/erp/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<ErpProduct>) =>
    request<ErpProduct>(`/erp/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<{ message: string }>(`/erp/products/${id}`, { method: 'DELETE' }),

  // Warehouses
  listWarehouses: () => request<ErpWarehouse[]>('/erp/warehouses'),
  createWarehouse: (data: Partial<ErpWarehouse>) =>
    request<ErpWarehouse>('/erp/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: string, data: Partial<ErpWarehouse>) =>
    request<ErpWarehouse>(`/erp/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWarehouse: (id: string) =>
    request<{ message: string }>(`/erp/warehouses/${id}`, { method: 'DELETE' }),

  // Sales Orders
  listSalesOrders: () => request<ErpSalesOrder[]>('/erp/sales-orders'),
  createSalesOrder: (data: Partial<ErpSalesOrder>) =>
    request<ErpSalesOrder>('/erp/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: Partial<ErpSalesOrder>) =>
    request<ErpSalesOrder>(`/erp/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalesOrder: (id: string) =>
    request<{ message: string }>(`/erp/sales-orders/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  listPurchaseOrders: () => request<ErpPurchaseOrder[]>('/erp/purchase-orders'),
  createPurchaseOrder: (data: Partial<ErpPurchaseOrder>) =>
    request<ErpPurchaseOrder>('/erp/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: Partial<ErpPurchaseOrder>) =>
    request<ErpPurchaseOrder>(`/erp/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePurchaseOrder: (id: string) =>
    request<{ message: string }>(`/erp/purchase-orders/${id}`, { method: 'DELETE' }),

  // Invoices
  listInvoices: () => request<ErpInvoice[]>('/erp/invoices'),
  createInvoice: (data: Partial<ErpInvoice>) =>
    request<ErpInvoice>('/erp/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: Partial<ErpInvoice>) =>
    request<ErpInvoice>(`/erp/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) =>
    request<{ message: string }>(`/erp/invoices/${id}`, { method: 'DELETE' }),

  // Payments
  listPayments: () => request<ErpPayment[]>('/erp/payments'),
  createPayment: (data: Partial<ErpPayment>) =>
    request<ErpPayment>('/erp/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Accounts (Chart of Accounts)
  listAccounts: () => request<ErpAccount[]>('/erp/accounts'),
  createAccount: (data: Partial<ErpAccount>) =>
    request<ErpAccount>('/erp/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<ErpAccount>) =>
    request<ErpAccount>(`/erp/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  seedAccounts: () => request<{ message: string }>('/erp/accounts/seed', { method: 'POST' }),

  // Journal Entries
  listJournalEntries: () => request<ErpJournalEntry[]>('/erp/journal-entries'),
  createJournalEntry: (data: Partial<ErpJournalEntry>) =>
    request<ErpJournalEntry>('/erp/journal-entries', { method: 'POST', body: JSON.stringify(data) }),
  updateJournalEntry: (id: string, data: Partial<ErpJournalEntry>) =>
    request<ErpJournalEntry>(`/erp/journal-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Stock Movements
  listStockMovements: () => request<ErpStockMovement[]>('/erp/stock-movements'),
  createStockMovement: (data: Partial<ErpStockMovement>) =>
    request<ErpStockMovement>('/erp/stock-movements', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  listEmployees: () => request<ErpEmployee[]>('/erp/employees'),
  createEmployee: (data: Partial<ErpEmployee>) =>
    request<ErpEmployee>('/erp/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<ErpEmployee>) =>
    request<ErpEmployee>(`/erp/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    request<{ message: string }>(`/erp/employees/${id}`, { method: 'DELETE' }),

  // Attendance
  listAttendance: () => request<ErpAttendance[]>('/erp/attendance'),
  createAttendance: (data: Partial<ErpAttendance>) =>
    request<ErpAttendance>('/erp/attendance', { method: 'POST', body: JSON.stringify(data) }),
  updateAttendance: (id: string, data: Partial<ErpAttendance>) =>
    request<ErpAttendance>(`/erp/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Quotes
  listQuotes: () => request<ErpQuote[]>('/erp/quotes'),
  getQuote: (id: string) => request<ErpQuote>(`/erp/quotes/${id}`),
  createQuote: (data: Partial<ErpQuote>) =>
    request<ErpQuote>('/erp/quotes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuote: (id: string, data: Partial<ErpQuote>) =>
    request<ErpQuote>(`/erp/quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuote: (id: string) =>
    request<{ message: string }>(`/erp/quotes/${id}`, { method: 'DELETE' }),
  convertQuoteToInvoice: (id: string) =>
    request<{ message: string; invoice: ErpInvoice }>(`/erp/quotes/${id}/convert-to-invoice`, { method: 'POST' }),

  // Settings
  listSettings: () => request<ErpSetting[]>('/erp/settings'),
  getSettingsByCategory: (category: string) =>
    request<ErpSetting[]>(`/erp/settings/${category}`),
  updateSetting: (category: string, key: string, value: any) =>
    request<ErpSetting>(`/erp/settings/${category}/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  bulkUpdateSettings: (settings: { category: string; key: string; value: any; label?: string; description?: string; valueType?: string }[]) =>
    request<ErpSetting[]>('/erp/settings/bulk', { method: 'POST', body: JSON.stringify({ settings }) }),
  seedSettings: () => request<{ message: string }>('/erp/settings/seed', { method: 'POST' }),

  // Invoice overdue check
  checkOverdueInvoices: () => request<{ message: string; modified: number }>('/erp/invoices/check-overdue', { method: 'POST' }),

  // ============================================
  // INSTALLATIONS
  // ============================================
  listInstallations: (params: InstallationListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const s = qs.toString();
    return request<InstallationListResponse>(`/erp/installations${s ? `?${s}` : ''}`);
  },
  getInstallation: (id: string) => request<ErpInstallation>(`/erp/installations/${id}`),
  createInstallation: (data: Partial<ErpInstallation> & { lat?: number; lng?: number }) =>
    request<ErpInstallation>('/erp/installations', { method: 'POST', body: JSON.stringify(data) }),
  updateInstallation: (id: string, data: Partial<ErpInstallation> & { lat?: number; lng?: number }) =>
    request<ErpInstallation>(`/erp/installations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelInstallation: (id: string, reason: string) =>
    request<ErpInstallation>(`/erp/installations/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  createInstallationFromQuote: (quoteId: string, data: Partial<ErpInstallation> = {}) =>
    request<ErpInstallation>(`/erp/installations/from-quote/${quoteId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Stage transitions
  startStage: (id: string, n: number) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/start`, { method: 'POST' }),
  completeStage: (id: string, n: number, opts: { reason?: string; adminOverride?: boolean } = {}) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/complete`, { method: 'POST', body: JSON.stringify(opts) }),
  blockStage: (id: string, n: number, reason: string) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/block`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unblockStage: (id: string, n: number) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/unblock`, { method: 'POST' }),
  updateChecklistItem: (id: string, n: number, key: string, data: { value?: string; isDone?: boolean }) =>
    request<{ stageNumber: number; code: string; checklist: unknown }>(
      `/erp/installations/${id}/stages/${n}/checklist/${key}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Read-only journal + aggregates
  getInstallationEvents: (id: string) => request<InstallationEvent[]>(`/erp/installations/${id}/events`),
  installationStats: () => request<InstallationStats>('/erp/installations/stats/summary'),
  installationMap: () => request<InstallationMapPoint[]>('/erp/installations/map'),

  // Stage media (multipart)
  uploadStagePhotos: (id: string, n: number, files: RnFile[], meta: { checklistKey?: string; caption?: string; takenAt?: string; lat?: number; lng?: number } = {}) => {
    const fields: Record<string, any> = {};
    if (meta.checklistKey) fields.checklistKey = meta.checklistKey;
    if (meta.caption) fields.caption = meta.caption;
    if (meta.takenAt) fields.takenAt = meta.takenAt;
    if (meta.lat != null) fields.lat = String(meta.lat);
    if (meta.lng != null) fields.lng = String(meta.lng);
    const fd = buildFormData(fields);
    files.forEach((f) => fd.append('photos', f as any));
    return request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/photos`, { method: 'POST', body: fd });
  },
  uploadStageDocument: (id: string, n: number, file: RnFile, meta: { type?: string; checklistKey?: string } = {}) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/documents`, {
      method: 'POST',
      body: buildFormData(meta, { document: file }),
    }),
  deleteStagePhoto: (id: string, n: number, photoId: string) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/photos/${photoId}`, { method: 'DELETE' }),
  deleteStageDocument: (id: string, n: number, docId: string) =>
    request<ErpInstallation>(`/erp/installations/${id}/stages/${n}/documents/${docId}`, { method: 'DELETE' }),

  // Checklist configuration (admin)
  getChecklistsConfig: () => request<ChecklistConfigResponse>('/erp/installations/config/checklists'),
  saveChecklistsConfig: (checklists: Record<string, ChecklistConfigItem[] | null>) =>
    request<ChecklistConfigResponse>('/erp/installations/config/checklists', {
      method: 'PUT', body: JSON.stringify({ checklists }),
    }),
};
