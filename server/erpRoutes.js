import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================
// ERP SCHEMAS
// ============================================

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  address: String,
  city: String,
  country: { type: String, default: 'Tunisia' },
  taxId: String,
  customerGroup: { type: String, enum: ['individual', 'company', 'government'], default: 'individual' },
  totalBalance: { type: Number, default: 0 },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  address: String,
  city: String,
  country: { type: String, default: 'Tunisia' },
  taxId: String,
  supplierGroup: { type: String, enum: ['raw_material', 'equipment', 'service', 'other'], default: 'equipment' },
  totalBalance: { type: Number, default: 0 },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  description: String,
  category: { type: String, enum: ['panel', 'inverter', 'cable', 'protection', 'structure', 'accessory', 'service', 'other'], default: 'other' },
  unit: { type: String, default: 'pcs' },
  buyingPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  minStockQty: { type: Number, default: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpWarehouse' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const lineItemSchema = {
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpProduct' },
  productName: String,
  qty: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
};

const salesOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpCustomer', required: true },
  customerName: String,
  date: { type: Date, default: Date.now },
  deliveryDate: Date,
  items: [lineItemSchema],
  totalQty: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 19 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'confirmed', 'delivered', 'invoiced', 'cancelled'], default: 'draft' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpSupplier', required: true },
  supplierName: String,
  date: { type: Date, default: Date.now },
  expectedDate: Date,
  items: [lineItemSchema],
  totalQty: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 19 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'ordered', 'received', 'cancelled'], default: 'draft' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpSalesOrder' },
  quote: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpQuote' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpCustomer', required: true },
  customerName: String,
  date: { type: Date, default: Date.now },
  dueDate: Date,
  year: { type: Number },
  items: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 19 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  currency: { type: String, default: 'TND' },
  paidAmount: { type: Number, default: 0 },
  outstandingAmount: { type: Number, default: 0 },
  recurring: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'], default: 'none' },
  isOverdue: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  pdf: String,
  notes: String,
  status: { type: String, enum: ['draft', 'sent', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled', 'on_hold'], default: 'draft' },
  files: [{
    name: String,
    path: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpCustomer', required: true },
  customerName: String,
  date: { type: Date, default: Date.now },
  expiryDate: Date,
  year: { type: Number },
  items: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 19 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  currency: { type: String, default: 'TND' },
  notes: String,
  terms: String,
  convertedToInvoice: { type: Boolean, default: false },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpInvoice' },
  status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'], default: 'draft' },
  pdf: String,
  files: [{
    name: String,
    path: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const settingSchema = new mongoose.Schema({
  category: { type: String, required: true, lowercase: true },
  key: { type: String, required: true, lowercase: true },
  value: { type: mongoose.Schema.Types.Mixed },
  valueType: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
  label: String,
  description: String,
  isPrivate: { type: Boolean, default: false },
  isCore: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});
settingSchema.index({ category: 1, key: 1 }, { unique: true });

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpInvoice' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpCustomer' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ['cash', 'bank_transfer', 'check', 'card'], default: 'bank_transfer' },
  reference: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const accountSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['asset', 'liability', 'income', 'expense', 'equity'], required: true },
  parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpAccount' },
  balance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const journalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  description: String,
  lines: [{
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpAccount' },
    accountName: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  }],
  totalDebit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'submitted', 'cancelled'], default: 'draft' },
  reference: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpProduct', required: true },
  productName: String,
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpWarehouse' },
  warehouseName: String,
  type: { type: String, enum: ['in', 'out', 'transfer', 'adjustment'], required: true },
  qty: { type: Number, required: true },
  previousQty: { type: Number, default: 0 },
  newQty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  reference: String,
  reason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: String,
  phone: String,
  department: { type: String, enum: ['management', 'sales', 'engineering', 'installation', 'maintenance', 'finance', 'hr', 'other'], default: 'other' },
  designation: String,
  dateOfJoining: { type: Date, default: Date.now },
  salary: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  address: String,
  emergencyContact: String,
  bankAccount: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpEmployee', required: true },
  employeeName: String,
  date: { type: Date, required: true },
  checkIn: Date,
  checkOut: Date,
  status: { type: String, enum: ['present', 'absent', 'half_day', 'on_leave', 'late'], default: 'present' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// ============================================
// MODELS
// ============================================

const Customer = mongoose.model('ErpCustomer', customerSchema);
const Supplier = mongoose.model('ErpSupplier', supplierSchema);
const Product = mongoose.model('ErpProduct', productSchema);
const Warehouse = mongoose.model('ErpWarehouse', warehouseSchema);
const SalesOrder = mongoose.model('ErpSalesOrder', salesOrderSchema);
const PurchaseOrder = mongoose.model('ErpPurchaseOrder', purchaseOrderSchema);
const Invoice = mongoose.model('ErpInvoice', invoiceSchema);
const Quote = mongoose.model('ErpQuote', quoteSchema);
const Setting = mongoose.model('ErpSetting', settingSchema);
const Payment = mongoose.model('ErpPayment', paymentSchema);
const Account = mongoose.model('ErpAccount', accountSchema);
const JournalEntry = mongoose.model('ErpJournalEntry', journalEntrySchema);
const StockMovement = mongoose.model('ErpStockMovement', stockMovementSchema);
const Employee = mongoose.model('ErpEmployee', employeeSchema);
const Attendance = mongoose.model('ErpAttendance', attendanceSchema);

// ============================================
// HELPER: Auto-generate order numbers
// ============================================

const generateNumber = async (Model, prefix, field = 'orderNumber') => {
  const count = await Model.countDocuments();
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
};

const computeTotals = (items, taxRate = 19, discount = 0) => {
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0) - discount;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  return { totalQty, subtotal, taxAmount, grandTotal };
};

// ============================================
// CUSTOMER ROUTES
// ============================================

router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(customers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/customers', async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(customer);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('createdBy', 'name email');
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json(customer);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json(customer);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// SUPPLIER ROUTES
// ============================================

router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await Supplier.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(supplier);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Not found' });
    res.json(supplier);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// PRODUCT ROUTES
// ============================================

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().populate('warehouse', 'name').populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(products);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/products', async (req, res) => {
  try {
    if (!req.body.sku) {
      req.body.sku = `PRD-${Date.now().toString(36).toUpperCase()}`;
    }
    const product = await Product.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(product);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// WAREHOUSE ROUTES
// ============================================

router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().populate('manager', 'name email').sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/warehouses', async (req, res) => {
  try {
    const warehouse = await Warehouse.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(warehouse);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/warehouses/:id', async (req, res) => {
  try {
    const wh = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!wh) return res.status(404).json({ message: 'Not found' });
    res.json(wh);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/warehouses/:id', async (req, res) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// SALES ORDER ROUTES
// ============================================

router.get('/sales-orders', async (req, res) => {
  try {
    const orders = await SalesOrder.find()
      .populate('customer', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/sales-orders', async (req, res) => {
  try {
    const orderNumber = await generateNumber(SalesOrder, 'SO');
    const items = (req.body.items || []).map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    const totals = computeTotals(items, req.body.taxRate, req.body.discount);
    const customer = await Customer.findById(req.body.customer);
    const order = await SalesOrder.create({
      ...req.body, orderNumber, items, ...totals,
      customerName: customer?.name || '',
      createdBy: req.user.id
    });
    const populated = await order.populate('customer', 'name email phone');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/sales-orders/:id', async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (req.body.items) {
      req.body.items = req.body.items.map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    }
    const items = req.body.items || order.items;
    const totals = computeTotals(items, req.body.taxRate ?? order.taxRate, req.body.discount ?? order.discount);
    Object.assign(order, req.body, totals, { updatedAt: new Date() });
    const updated = await order.save();
    await updated.populate('customer', 'name email phone');
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/sales-orders/:id', async (req, res) => {
  try {
    await SalesOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// PURCHASE ORDER ROUTES
// ============================================

router.get('/purchase-orders', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/purchase-orders', async (req, res) => {
  try {
    const orderNumber = await generateNumber(PurchaseOrder, 'PO');
    const items = (req.body.items || []).map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    const totals = computeTotals(items, req.body.taxRate);
    const supplier = await Supplier.findById(req.body.supplier);
    const order = await PurchaseOrder.create({
      ...req.body, orderNumber, items, ...totals,
      supplierName: supplier?.name || '',
      createdBy: req.user.id
    });
    const populated = await order.populate('supplier', 'name email phone');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (req.body.items) {
      req.body.items = req.body.items.map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    }
    const items = req.body.items || order.items;
    const totals = computeTotals(items, req.body.taxRate ?? order.taxRate);
    Object.assign(order, req.body, totals, { updatedAt: new Date() });
    const updated = await order.save();
    await updated.populate('supplier', 'name email phone');
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// INVOICE ROUTES
// ============================================

router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email phone')
      .populate('salesOrder', 'orderNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/invoices', async (req, res) => {
  try {
    const invoiceNumber = await generateNumber(Invoice, 'INV');
    const items = (req.body.items || []).map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    const totals = computeTotals(items, req.body.taxRate);
    const customer = await Customer.findById(req.body.customer);
    const invoice = await Invoice.create({
      ...req.body, invoiceNumber, items, ...totals,
      outstandingAmount: totals.grandTotal - (req.body.paidAmount || 0),
      customerName: customer?.name || '',
      status: (req.body.paidAmount || 0) >= totals.grandTotal ? 'paid' : 'unpaid',
      createdBy: req.user.id
    });
    if (invoice.status === 'unpaid' || invoice.status === 'partially_paid') {
      await Customer.findByIdAndUpdate(req.body.customer, { $inc: { totalBalance: invoice.outstandingAmount } });
    }
    const populated = await invoice.populate('customer', 'name email phone');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Not found' });
    Object.assign(invoice, req.body, { updatedAt: new Date() });
    invoice.outstandingAmount = invoice.grandTotal - invoice.paidAmount;
    if (invoice.outstandingAmount <= 0) invoice.status = 'paid';
    else if (invoice.paidAmount > 0) invoice.status = 'partially_paid';
    const updated = await invoice.save();
    await updated.populate('customer', 'name email phone');
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// PAYMENT ROUTES
// ============================================

router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('customer', 'name email')
      .populate('invoice', 'invoiceNumber grandTotal')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/payments', async (req, res) => {
  try {
    const paymentNumber = await generateNumber(Payment, 'PAY');
    const payment = await Payment.create({ ...req.body, paymentNumber, createdBy: req.user.id });
    if (req.body.invoice) {
      const invoice = await Invoice.findById(req.body.invoice);
      if (invoice) {
        invoice.paidAmount += payment.amount;
        invoice.outstandingAmount = invoice.grandTotal - invoice.paidAmount;
        invoice.status = invoice.outstandingAmount <= 0 ? 'paid' : 'partially_paid';
        invoice.updatedAt = new Date();
        await invoice.save();
        await Customer.findByIdAndUpdate(invoice.customer, { $inc: { totalBalance: -payment.amount } });
      }
    }
    const populated = await payment.populate('customer', 'name email');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// ACCOUNT ROUTES (Chart of Accounts)
// ============================================

router.get('/accounts', async (req, res) => {
  try {
    const accounts = await Account.find().populate('parentAccount', 'name accountNumber').sort({ accountNumber: 1 });
    res.json(accounts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/accounts', async (req, res) => {
  try {
    const account = await Account.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(account);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!account) return res.status(404).json({ message: 'Not found' });
    res.json(account);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Seed default chart of accounts
router.post('/accounts/seed', async (req, res) => {
  try {
    const count = await Account.countDocuments();
    if (count > 0) return res.json({ message: 'Accounts already seeded', count });
    const defaults = [
      { accountNumber: '1000', name: 'Cash', type: 'asset' },
      { accountNumber: '1100', name: 'Bank Account', type: 'asset' },
      { accountNumber: '1200', name: 'Accounts Receivable', type: 'asset' },
      { accountNumber: '1300', name: 'Inventory', type: 'asset' },
      { accountNumber: '2000', name: 'Accounts Payable', type: 'liability' },
      { accountNumber: '2100', name: 'Tax Payable', type: 'liability' },
      { accountNumber: '3000', name: 'Owner Equity', type: 'equity' },
      { accountNumber: '4000', name: 'Sales Revenue', type: 'income' },
      { accountNumber: '4100', name: 'Service Revenue', type: 'income' },
      { accountNumber: '5000', name: 'Cost of Goods Sold', type: 'expense' },
      { accountNumber: '5100', name: 'Salaries Expense', type: 'expense' },
      { accountNumber: '5200', name: 'Rent Expense', type: 'expense' },
      { accountNumber: '5300', name: 'Utilities Expense', type: 'expense' },
      { accountNumber: '5400', name: 'Office Supplies', type: 'expense' },
    ];
    const accounts = await Account.insertMany(defaults.map(a => ({ ...a, createdBy: req.user.id })));
    res.status(201).json({ message: 'Chart of accounts seeded', accounts });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// JOURNAL ENTRY ROUTES
// ============================================

router.get('/journal-entries', async (req, res) => {
  try {
    const entries = await JournalEntry.find()
      .populate('lines.account', 'name accountNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/journal-entries', async (req, res) => {
  try {
    const entryNumber = await generateNumber(JournalEntry, 'JE');
    const lines = req.body.lines || [];
    const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    const entry = await JournalEntry.create({
      ...req.body, entryNumber, lines, totalDebit, totalCredit,
      createdBy: req.user.id
    });
    if (req.body.status === 'submitted') {
      for (const line of lines) {
        await Account.findByIdAndUpdate(line.account, { $inc: { balance: (line.debit || 0) - (line.credit || 0) } });
      }
    }
    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/journal-entries/:id', async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    Object.assign(entry, req.body);
    entry.totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
    entry.totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
    const updated = await entry.save();
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// STOCK MOVEMENT ROUTES
// ============================================

router.get('/stock-movements', async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate('product', 'name sku')
      .populate('warehouse', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(movements);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/stock-movements', async (req, res) => {
  try {
    const product = await Product.findById(req.body.product);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const previousQty = product.stockQty;
    let newQty = previousQty;
    if (req.body.type === 'in' || req.body.type === 'adjustment') {
      newQty = previousQty + req.body.qty;
    } else if (req.body.type === 'out') {
      newQty = previousQty - req.body.qty;
    }
    product.stockQty = newQty;
    await product.save();
    const warehouse = req.body.warehouse ? await Warehouse.findById(req.body.warehouse) : null;
    const movement = await StockMovement.create({
      ...req.body, productName: product.name,
      warehouseName: warehouse?.name || '',
      previousQty, newQty,
      createdBy: req.user.id
    });
    res.status(201).json(movement);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// EMPLOYEE ROUTES
// ============================================

router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(employees);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/employees', async (req, res) => {
  try {
    if (!req.body.employeeId) {
      const count = await Employee.countDocuments();
      req.body.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }
    const employee = await Employee.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// ATTENDANCE ROUTES
// ============================================

router.get('/attendance', async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('employee', 'firstName lastName employeeId department')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/attendance', async (req, res) => {
  try {
    const employee = await Employee.findById(req.body.employee);
    const record = await Attendance.create({
      ...req.body,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : '',
      createdBy: req.user.id
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/attendance/:id', async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// QUOTE ROUTES
// ============================================

router.get('/quotes', async (req, res) => {
  try {
    const quotes = await Quote.find()
      .populate('customer', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('invoice', 'invoiceNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/quotes', async (req, res) => {
  try {
    const quoteNumber = await generateNumber(Quote, 'QT');
    const items = (req.body.items || []).map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    const totals = computeTotals(items, req.body.taxRate, req.body.discount);
    const customer = await Customer.findById(req.body.customer);
    const quote = await Quote.create({
      ...req.body, quoteNumber, items, ...totals,
      year: new Date().getFullYear(),
      customerName: customer?.name || '',
      createdBy: req.user.id
    });
    const populated = await quote.populate('customer', 'name email phone');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/quotes/:id', async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('invoice', 'invoiceNumber');
    if (!quote) return res.status(404).json({ message: 'Not found' });
    res.json(quote);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/quotes/:id', async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Not found' });
    if (req.body.items) {
      req.body.items = req.body.items.map(i => ({ ...i, amount: (i.qty || 0) * (i.rate || 0) }));
    }
    const items = req.body.items || quote.items;
    const totals = computeTotals(items, req.body.taxRate ?? quote.taxRate, req.body.discount ?? quote.discount);
    Object.assign(quote, req.body, totals, { updatedAt: new Date() });
    const updated = await quote.save();
    await updated.populate('customer', 'name email phone');
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/quotes/:id', async (req, res) => {
  try {
    await Quote.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Convert Quote to Invoice
router.post('/quotes/:id/convert-to-invoice', async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (quote.convertedToInvoice) return res.status(400).json({ message: 'Quote already converted' });

    const invoiceNumber = await generateNumber(Invoice, 'INV');
    const invoice = await Invoice.create({
      invoiceNumber,
      quote: quote._id,
      customer: quote.customer,
      customerName: quote.customerName,
      items: quote.items,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      grandTotal: quote.grandTotal,
      discount: quote.discount,
      currency: quote.currency,
      notes: quote.notes,
      year: new Date().getFullYear(),
      paidAmount: 0,
      outstandingAmount: quote.grandTotal,
      status: 'unpaid',
      createdBy: req.user.id
    });

    quote.convertedToInvoice = true;
    quote.invoice = invoice._id;
    quote.status = 'converted';
    quote.updatedAt = new Date();
    await quote.save();

    await Customer.findByIdAndUpdate(quote.customer, { $inc: { totalBalance: quote.grandTotal } });

    const populated = await invoice.populate('customer', 'name email phone');
    res.status(201).json({ message: 'Quote converted to invoice', invoice: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// SETTINGS ROUTES
// ============================================

router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.find({ isPrivate: { $ne: true } }).sort({ category: 1, key: 1 });
    res.json(settings);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/settings/:category', async (req, res) => {
  try {
    const settings = await Setting.find({ category: req.params.category, isPrivate: { $ne: true } }).sort({ key: 1 });
    res.json(settings);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/settings/:category/:key', async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { category: req.params.category, key: req.params.key },
      { value: req.body.value, updatedBy: req.user.id, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(setting);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/settings/bulk', async (req, res) => {
  try {
    const updates = req.body.settings || [];
    const results = [];
    for (const s of updates) {
      const setting = await Setting.findOneAndUpdate(
        { category: s.category, key: s.key },
        { value: s.value, label: s.label, description: s.description, valueType: s.valueType, updatedBy: req.user.id, updatedAt: new Date() },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      results.push(setting);
    }
    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Seed default settings
router.post('/settings/seed', async (req, res) => {
  try {
    const count = await Setting.countDocuments();
    if (count > 0) return res.json({ message: 'Settings already seeded', count });
    const defaults = [
      { category: 'company', key: 'company_name', value: 'Supramax Energy', label: 'Company Name', valueType: 'string' },
      { category: 'company', key: 'company_email', value: 'contact@supramax.tn', label: 'Company Email', valueType: 'string' },
      { category: 'company', key: 'company_phone', value: '+216 XX XXX XXX', label: 'Company Phone', valueType: 'string' },
      { category: 'company', key: 'company_address', value: '', label: 'Company Address', valueType: 'string' },
      { category: 'company', key: 'company_logo', value: '', label: 'Company Logo URL', valueType: 'string' },
      { category: 'company', key: 'tax_id', value: '', label: 'Tax ID / VAT Number', valueType: 'string' },
      { category: 'general', key: 'currency', value: 'TND', label: 'Default Currency', valueType: 'string' },
      { category: 'general', key: 'tax_rate', value: 19, label: 'Default Tax Rate (%)', valueType: 'number' },
      { category: 'general', key: 'language', value: 'fr', label: 'Language', valueType: 'string' },
      { category: 'general', key: 'date_format', value: 'DD/MM/YYYY', label: 'Date Format', valueType: 'string' },
      { category: 'invoice', key: 'invoice_prefix', value: 'INV', label: 'Invoice Prefix', valueType: 'string' },
      { category: 'invoice', key: 'invoice_start_number', value: 1, label: 'Start Number', valueType: 'number' },
      { category: 'invoice', key: 'payment_terms', value: 30, label: 'Payment Terms (days)', valueType: 'number' },
      { category: 'quote', key: 'quote_prefix', value: 'QT', label: 'Quote Prefix', valueType: 'string' },
      { category: 'quote', key: 'quote_validity_days', value: 30, label: 'Quote Validity (days)', valueType: 'number' },
    ];
    const settings = await Setting.insertMany(defaults.map(s => ({ ...s, isCore: true, updatedBy: req.user.id })));
    res.status(201).json({ message: 'Settings seeded', settings });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// INVOICE OVERDUE CHECK (run periodically)
// ============================================

router.post('/invoices/check-overdue', async (req, res) => {
  try {
    const now = new Date();
    const overdueInvoices = await Invoice.updateMany(
      { status: { $in: ['unpaid', 'partially_paid', 'sent'] }, dueDate: { $lt: now }, isOverdue: false },
      { $set: { isOverdue: true, status: 'overdue' } }
    );
    res.json({ message: 'Overdue check complete', modified: overdueInvoices.modifiedCount });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// ERP DASHBOARD STATS
// ============================================

router.get('/stats', async (req, res) => {
  try {
    const [customerCount, supplierCount, productCount, salesOrderCount, invoiceCount,
           purchaseOrderCount, employeeCount, quoteCount, lowStockProducts, totalRevenue,
           totalOutstanding, overdueInvoices] = await Promise.all([
      Customer.countDocuments(),
      Supplier.countDocuments(),
      Product.countDocuments(),
      SalesOrder.countDocuments(),
      Invoice.countDocuments(),
      PurchaseOrder.countDocuments(),
      Employee.countDocuments(),
      Quote.countDocuments(),
      Product.find({ $expr: { $lte: ['$stockQty', '$minStockQty'] } }),
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Invoice.aggregate([{ $match: { status: { $in: ['unpaid', 'partially_paid', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }]),
      Invoice.countDocuments({ isOverdue: true })
    ]);
    res.json({
      customerCount, supplierCount, productCount, salesOrderCount,
      invoiceCount, purchaseOrderCount, employeeCount, quoteCount,
      lowStockProducts: lowStockProducts.length,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOutstanding: totalOutstanding[0]?.total || 0,
      overdueInvoices
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export { router as erpRouter };
