// ── supplierRoutes.js ────────────────────────────────────────────────────────
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const Supplier = require('../models/Supplier');

const supplierRouter = express.Router();
supplierRouter.use(protect);
supplierRouter.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const q = search ? { $text: { $search: search } } : {};
  const suppliers = await Supplier.find({ ...q, isActive: true }).sort('name');
  res.json({ success: true, data: suppliers });
}));
supplierRouter.post('/', authorize('super_admin','admin'), asyncHandler(async (req, res) => {
  const count = await Supplier.countDocuments();
  req.body.code = `SUPP${String(count+1).padStart(4,'0')}`;
  const s = await Supplier.create(req.body);
  res.status(201).json({ success: true, data: s });
}));
supplierRouter.route('/:id')
  .get(asyncHandler(async (req, res) => {
    const s = await Supplier.findById(req.params.id);
    if (!s) { res.status(404); throw new Error('Fournisseur introuvable'); }
    res.json({ success: true, data: s });
  }))
  .put(authorize('super_admin','admin'), asyncHandler(async (req, res) => {
    const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: s });
  }));
module.exports = { supplierRouter };

// ── clientRoutes.js ──────────────────────────────────────────────────────────
const Client = require('../models/Client');
const clientRouter = express.Router();
clientRouter.use(protect);
clientRouter.get('/', asyncHandler(async (req, res) => {
  const { search, level, page=1, limit=50 } = req.query;
  const q = {};
  if (search) q.$text = { $search: search };
  if (level) q.loyaltyLevel = level;
  const [data, total] = await Promise.all([
    Client.find(q).sort('-lastVisit').skip((page-1)*limit).limit(+limit),
    Client.countDocuments(q),
  ]);
  res.json({ success: true, total, data });
}));
clientRouter.post('/', asyncHandler(async (req, res) => {
  const c = await Client.create(req.body);
  res.status(201).json({ success: true, data: c });
}));
clientRouter.route('/:id')
  .get(asyncHandler(async (req, res) => {
    const c = await Client.findById(req.params.id);
    if (!c) { res.status(404); throw new Error('Client introuvable'); }
    res.json({ success: true, data: c });
  }))
  .put(asyncHandler(async (req, res) => {
    const c = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: c });
  }));
clientRouter.get('/:id/sales', asyncHandler(async (req, res) => {
  const Sale = require('../models/Sale');
  const sales = await Sale.find({ client: req.params.id }).sort('-createdAt').limit(50);
  res.json({ success: true, data: sales });
}));
module.exports.clientRouter = clientRouter;

// ── orderRoutes.js ───────────────────────────────────────────────────────────
const Order = require('../models/Order');
const orderRouter = express.Router();
orderRouter.use(protect);
orderRouter.get('/', asyncHandler(async (req, res) => {
  const { status, supplier, page=1, limit=20 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (supplier) q.supplier = supplier;
  const [data, total] = await Promise.all([
    Order.find(q).populate('supplier','name').populate('createdBy','firstName lastName').sort('-createdAt').skip((page-1)*limit).limit(+limit),
    Order.countDocuments(q),
  ]);
  res.json({ success: true, total, data });
}));
orderRouter.post('/', authorize('super_admin','admin'), asyncHandler(async (req, res) => {
  const o = await Order.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: o });
}));
orderRouter.route('/:id')
  .get(asyncHandler(async (req, res) => {
    const o = await Order.findById(req.params.id).populate('supplier').populate('items.product','name').populate('createdBy','firstName lastName');
    if (!o) { res.status(404); throw new Error('Commande introuvable'); }
    res.json({ success: true, data: o });
  }))
  .put(asyncHandler(async (req, res) => {
    const o = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: o });
  }));
orderRouter.put('/:id/status', authorize('super_admin','admin'), asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const o = await Order.findById(req.params.id);
  if (!o) { res.status(404); throw new Error('Commande introuvable'); }
  o.status = status;
  o.auditLog.push({ action: `Statut → ${status}`, by: req.user._id, note });
  if (status === 'reçu') o.receivedDate = new Date();
  await o.save();
  req.io?.emit('order:updated', { orderNumber: o.orderNumber, status });
  res.json({ success: true, data: o });
}));
module.exports.orderRouter = orderRouter;

// ── prescriptionRoutes.js ────────────────────────────────────────────────────
const Prescription = require('../models/Prescription');
const prescriptionRouter = express.Router();
prescriptionRouter.use(protect);
prescriptionRouter.get('/', asyncHandler(async (req, res) => {
  const { page=1, limit=100 } = req.query;
  const [data, total] = await Promise.all([
    Prescription.find().sort('-date').skip((page-1)*limit).limit(+limit),
    Prescription.countDocuments(),
  ]);
  res.json({ success: true, total, data });
}));
prescriptionRouter.post('/', asyncHandler(async (req, res) => {
  const p = await Prescription.create({ ...req.body, registeredBy: req.user._id });
  res.status(201).json({ success: true, data: p });
}));
prescriptionRouter.route('/:id')
  .get(asyncHandler(async (req, res) => {
    const p = await Prescription.findById(req.params.id).populate('client','firstName lastName phone');
    if (!p) { res.status(404); throw new Error('Ordonnance introuvable'); }
    res.json({ success: true, data: p });
  }))
  .delete(asyncHandler(async (req, res) => {
    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));
module.exports.prescriptionRouter = prescriptionRouter;

// ── invoiceRoutes.js ─────────────────────────────────────────────────────────
const Invoice = require('../models/Invoice');
const invoiceRouter = express.Router();
invoiceRouter.use(protect);
invoiceRouter.get('/', asyncHandler(async (req, res) => {
  const { status, type, page=1, limit=30 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (type)   q.type   = type;
  const [data, total] = await Promise.all([
    Invoice.find(q).populate('client','firstName lastName').sort('-createdAt').skip((page-1)*limit).limit(+limit),
    Invoice.countDocuments(q),
  ]);
  res.json({ success: true, total, data });
}));
invoiceRouter.post('/', asyncHandler(async (req, res) => {
  const { client, clientName, items, tvaRate = 19, notes, type = 'vente' } = req.body;
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const tva      = Math.round(subtotal * (tvaRate / 100));
  const total    = subtotal + tva;
  const mapped   = items.map(i => ({
    description: i.description,
    quantity:    i.quantity,
    unitPrice:   i.unitPrice,
    tvaRate,
    total:       i.quantity * i.unitPrice,
  }));
  const inv = await Invoice.create({
    client: client || undefined,
    clientName: client ? undefined : clientName,
    type, items: mapped, subtotal, tva, total, notes,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: inv });
}));
invoiceRouter.get('/:id', asyncHandler(async (req, res) => {
  const inv = await Invoice.findById(req.params.id).populate('client').populate('sale');
  if (!inv) { res.status(404); throw new Error('Facture introuvable'); }
  res.json({ success: true, data: inv });
}));
invoiceRouter.put('/:id/pay', asyncHandler(async (req, res) => {
  const { amount, method } = req.body;
  const inv = await Invoice.findById(req.params.id);
  if (!inv) { res.status(404); throw new Error('Facture introuvable'); }
  inv.paidAmount += amount;
  inv.paymentMethod = method;
  inv.status = inv.paidAmount >= inv.total ? 'payée' : 'partiellement_payée';
  if (inv.status === 'payée') inv.paidAt = new Date();
  await inv.save();
  res.json({ success: true, data: inv });
}));
// Soft-delete: a financial document is never destroyed, only archived (status → annulée)
invoiceRouter.delete('/:id', authorize('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) { res.status(404); throw new Error('Facture introuvable'); }
  inv.status = 'annulée';
  inv.cancelledBy = req.user._id;
  inv.cancelledAt = new Date();
  await inv.save();
  res.json({ success: true, data: inv });
}));
module.exports.invoiceRouter = invoiceRouter;

// ── alertRoutes.js ───────────────────────────────────────────────────────────
const Alert = require('../models/Alert');
const alertRouter = express.Router();
alertRouter.use(protect);
alertRouter.get('/', asyncHandler(async (req, res) => {
  const { isResolved=false, severity, page=1, limit=50 } = req.query;
  const q = { isResolved: isResolved === 'true' };
  if (severity) q.severity = severity;
  const [data, total] = await Promise.all([
    Alert.find(q).populate('product','name').sort('-createdAt').skip((page-1)*limit).limit(+limit),
    Alert.countDocuments(q),
  ]);
  res.json({ success: true, total, data });
}));
alertRouter.put('/:id/resolve', asyncHandler(async (req, res) => {
  const a = await Alert.findByIdAndUpdate(req.params.id, {
    isResolved: true, resolvedBy: req.user._id, resolvedAt: new Date(), resolvedNote: req.body.note,
  }, { new: true });
  res.json({ success: true, data: a });
}));
alertRouter.put('/read-all', asyncHandler(async (req, res) => {
  await Alert.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true });
}));
module.exports.alertRouter = alertRouter;

// ── stockRoutes.js ───────────────────────────────────────────────────────────
const StockMovement = require('../models/StockMovement');
const stockRouter = express.Router();
stockRouter.use(protect);
stockRouter.get('/movements', asyncHandler(async (req, res) => {
  const { product, type, from, to, page=1, limit=50 } = req.query;
  const q = {};
  if (product) q.product = product;
  if (type)    q.type    = type;
  if (from || to) { q.createdAt = {}; if (from) q.createdAt.$gte = new Date(from); if (to) q.createdAt.$lte = new Date(to); }
  const [data, total] = await Promise.all([
    StockMovement.find(q).populate('product','name').populate('createdBy','firstName lastName').sort('-createdAt').skip((page-1)*limit).limit(+limit),
    StockMovement.countDocuments(q),
  ]);
  res.json({ success: true, total, data });
}));
module.exports.stockRouter = stockRouter;

// ── userRoutes.js ────────────────────────────────────────────────────────────
const User = require('../models/User');
const userRouter = express.Router();
userRouter.use(protect);
userRouter.get('/', authorize('super_admin','admin'), asyncHandler(async (req, res) => {
  const users = await User.find().sort('lastName');
  res.json({ success: true, data: users });
}));
userRouter.post('/', authorize('super_admin','admin'), asyncHandler(async (req, res) => {
  const u = await User.create(req.body);
  res.status(201).json({ success: true, data: u });
}));
userRouter.route('/:id')
  .get(authorize('super_admin','admin'), asyncHandler(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) { res.status(404); throw new Error('Utilisateur introuvable'); }
    res.json({ success: true, data: u });
  }))
  .put(authorize('super_admin','admin'), asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: u });
  }))
  .delete(authorize('super_admin','admin'), asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true, message: 'Utilisateur désactivé' });
  }));
module.exports.userRouter = userRouter;

// ── analyticsRoutes.js ───────────────────────────────────────────────────────
const analyticsRouter = express.Router();
analyticsRouter.use(protect);
const { ruptureForecast, aiSuggest, detectAnomalies, getConsumptionTrends } = require('../controllers/analyticsController');
analyticsRouter.get('/rupture-forecast', ruptureForecast);
analyticsRouter.post('/ai-suggest',      aiSuggest);
analyticsRouter.get('/anomalies',        detectAnomalies);
analyticsRouter.get('/trends',           getConsumptionTrends);
module.exports.analyticsRouter = analyticsRouter;
