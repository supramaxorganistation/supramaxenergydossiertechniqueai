// ============================================
// ERP TYPES
// ============================================

export type CustomerGroup = 'individual' | 'company' | 'government';
export type SupplierGroup = 'raw_material' | 'equipment' | 'service' | 'other';

export type ErpCustomer = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  customerGroup?: CustomerGroup;
  totalBalance?: number;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type ErpSupplier = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  supplierGroup?: SupplierGroup;
  totalBalance?: number;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type ProductCategory = 'panel' | 'inverter' | 'cable' | 'protection' | 'structure' | 'accessory' | 'service' | 'other';

export type ErpProduct = {
  _id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: ProductCategory;
  unit?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  stockQty?: number;
  minStockQty?: number;
  warehouse?: { _id: string; name: string } | string;
  isActive?: boolean;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type ErpWarehouse = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  manager?: { _id?: string; name: string; email: string };
  isActive?: boolean;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type LineItem = {
  product?: string | { _id: string; name: string; sku?: string };
  productName?: string;
  qty: number;
  rate: number;
  amount?: number;
};

export type SalesOrderStatus = 'draft' | 'confirmed' | 'delivered' | 'invoiced' | 'cancelled';

export type ErpSalesOrder = {
  _id: string;
  orderNumber?: string;
  customer: string | { _id: string; name: string; email?: string; phone?: string };
  customerName?: string;
  date?: string;
  deliveryDate?: string;
  items: LineItem[];
  totalQty?: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal?: number;
  discount?: number;
  status?: SalesOrderStatus;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export type ErpPurchaseOrder = {
  _id: string;
  orderNumber?: string;
  supplier: string | { _id: string; name: string; email?: string; phone?: string };
  supplierName?: string;
  date?: string;
  expectedDate?: string;
  items: LineItem[];
  totalQty?: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal?: number;
  status?: PurchaseOrderStatus;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';

export type ErpInvoice = {
  _id: string;
  invoiceNumber?: string;
  salesOrder?: { _id: string; orderNumber?: string } | string;
  quote?: { _id: string; quoteNumber?: string } | string;
  customer: string | { _id: string; name: string; email?: string; phone?: string };
  customerName?: string;
  date?: string;
  dueDate?: string;
  year?: number;
  items: LineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal?: number;
  discount?: number;
  currency?: string;
  paidAmount?: number;
  outstandingAmount?: number;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  isOverdue?: boolean;
  status?: InvoiceStatus;
  notes?: string;
  pdf?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card';

export type ErpPayment = {
  _id: string;
  paymentNumber?: string;
  invoice?: { _id: string; invoiceNumber?: string; grandTotal?: number } | string;
  customer?: { _id: string; name: string; email?: string } | string;
  amount: number;
  date?: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

export type ErpAccount = {
  _id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  parentAccount?: { _id: string; name: string; accountNumber: string } | string;
  balance?: number;
  isActive?: boolean;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type JournalLine = {
  account: string | { _id: string; name: string; accountNumber: string };
  accountName?: string;
  debit: number;
  credit: number;
};

export type JournalEntryStatus = 'draft' | 'submitted' | 'cancelled';

export type ErpJournalEntry = {
  _id: string;
  entryNumber?: string;
  date?: string;
  description?: string;
  lines: JournalLine[];
  totalDebit?: number;
  totalCredit?: number;
  status?: JournalEntryStatus;
  reference?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type StockMovementType = 'in' | 'out' | 'transfer' | 'adjustment';

export type ErpStockMovement = {
  _id: string;
  product: { _id: string; name: string; sku?: string } | string;
  productName?: string;
  warehouse?: { _id: string; name: string } | string;
  warehouseName?: string;
  type: StockMovementType;
  qty: number;
  previousQty?: number;
  newQty?: number;
  rate?: number;
  reference?: string;
  reason?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type EmployeeDepartment = 'management' | 'sales' | 'engineering' | 'installation' | 'maintenance' | 'finance' | 'hr' | 'other';
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';

export type ErpEmployee = {
  _id: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: EmployeeDepartment;
  designation?: string;
  dateOfJoining?: string;
  salary?: number;
  status?: EmployeeStatus;
  address?: string;
  emergencyContact?: string;
  bankAccount?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'late';

export type ErpAttendance = {
  _id: string;
  employee: { _id: string; firstName: string; lastName: string; employeeId?: string; department?: string } | string;
  employeeName?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  notes?: string;
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type ErpStats = {
  customerCount: number;
  supplierCount: number;
  productCount: number;
  salesOrderCount: number;
  invoiceCount: number;
  purchaseOrderCount: number;
  employeeCount: number;
  quoteCount: number;
  lowStockProducts: number;
  totalRevenue: number;
  totalOutstanding: number;
  overdueInvoices: number;
};

// ============================================
// QUOTE TYPES
// ============================================

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';

export type ErpQuote = {
  _id: string;
  quoteNumber?: string;
  customer: string | { _id: string; name: string; email?: string; phone?: string };
  customerName?: string;
  date?: string;
  expiryDate?: string;
  year?: number;
  items: LineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal?: number;
  discount?: number;
  currency?: string;
  notes?: string;
  terms?: string;
  convertedToInvoice?: boolean;
  invoice?: { _id: string; invoiceNumber?: string } | string;
  status?: QuoteStatus;
  pdf?: string;
  files?: { name: string; path: string; description?: string; uploadedAt?: string }[];
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
};

// ============================================
// SETTINGS TYPES
// ============================================

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export type ErpSetting = {
  _id: string;
  category: string;
  key: string;
  value: any;
  valueType?: SettingValueType;
  label?: string;
  description?: string;
  isPrivate?: boolean;
  isCore?: boolean;
  updatedBy?: { _id?: string; name: string; email: string };
  updatedAt?: string;
};
