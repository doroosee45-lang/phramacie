const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const StockMovement = require('../models/StockMovement');
const Alert = require('../models/Alert');
const Archive = require('../models/Archive');

// @desc  Create sale (POS checkout)
// @route POST /api/sales
exports.createSale = asyncHandler(async (req, res) => {
  const { items, clientId, prescriptionId, paymentMethod, amountPaid, discount = 0, isOffline } = req.body;

  if (!items?.length) { res.status(400); throw new Error('Panier vide'); }

  // Validate & deduct stock (FIFO)
  const enrichedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) { res.status(404); throw new Error(`Produit introuvable: ${item.productId}`); }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Stock insuffisant pour ${product.name}: disponible ${product.stock}`);
    }

    // FIFO lot deduction
    let remaining = item.quantity;
    const sortedLots = product.lots
      .filter(l => l.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    let usedLot = '';
    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const used = Math.min(lot.quantity, remaining);
      lot.quantity -= used;
      remaining -= used;
      usedLot = lot.lotNumber;
    }

    product.recalcStock();
    await product.save();

    const stockBefore = product.stock + item.quantity;
    await StockMovement.create({
      product: product._id, type: 'sortie', quantity: -item.quantity,
      lotNumber: usedLot, stockBefore, stockAfter: product.stock,
      reason: 'Vente POS', createdBy: req.user._id,
    });

    // Low stock alert
    if (product.stock <= product.minStock && product.stock > 0) {
      await Alert.create({
        type: 'stock_bas', severity: 'urgent',
        title: `Stock bas — ${product.name}`,
        message: `Stock: ${product.stock} unités (min: ${product.minStock})`,
        product: product._id,
      });
      req.io?.emit('alert:new', { type: 'stock_bas', product: product.name, stock: product.stock });
    }
    if (product.stock === 0) {
      await Alert.create({
        type: 'stock_rupture', severity: 'critique',
        title: `Rupture — ${product.name}`,
        message: `Le stock est épuisé après cette vente.`,
        product: product._id,
      });
      req.io?.emit('alert:new', { type: 'stock_rupture', product: product.name });
    }

    enrichedItems.push({
      product: product._id, name: product.name,
      quantity: item.quantity, unitPrice: product.retailPrice,
      discount: item.discount || 0,
      totalPrice: product.retailPrice * item.quantity * (1 - (item.discount || 0) / 100),
      lotNumber: usedLot,
    });
  }

  const subtotal    = enrichedItems.reduce((s, i) => s + i.totalPrice, 0);
  const discountAmt = Math.round((subtotal * discount) / 100 * 100) / 100;
  const tva         = Math.round((subtotal - discountAmt) * 0.19 * 100) / 100;
  const total       = Math.round((subtotal - discountAmt + tva) * 100) / 100;
  const change      = amountPaid ? Math.max(0, amountPaid - total) : 0;

  const sale = await Sale.create({
    items: enrichedItems,
    client: clientId || null,
    prescription: prescriptionId || null,
    subtotal, discount: discountAmt, tva, total,
    paymentMethod: paymentMethod || 'espèces',
    amountPaid, change, cashier: req.user._id, isOffline,
  });

  // Loyalty points
  if (clientId) {
    const client = await Client.findById(clientId);
    if (client) {
      client.loyaltyPoints += sale.loyaltyPoints;
      client.totalSpent += total;
      client.totalPurchases += 1;
      client.lastVisit = new Date();
      client.updateLoyaltyLevel();
      await client.save();
    }
  }

  // Auto-generate invoice
  const invoice = await Invoice.create({
    type: 'vente', sale: sale._id, client: clientId || null,
    items: enrichedItems.map(i => ({
      description: i.name, quantity: i.quantity,
      unitPrice: i.unitPrice, tvaRate: 19,
      total: i.totalPrice,
    })),
    subtotal, tva, total, status: 'payée', paidAt: new Date(),
    paymentMethod: paymentMethod || 'espèces', createdBy: req.user._id,
  });

  // Automatic archiving of the sale operation (immutable audit trail, SuperAdmin only)
  await Archive.create({
    operationType: 'vente', sale: sale._id, saleNumber: sale.saleNumber,
    performedBy: req.user._id, performedByName: `${req.user.firstName} ${req.user.lastName}`,
    performedByRole: req.user.role, client: clientId,
    itemsCount: enrichedItems.length, subtotal, discount: discountAmt, tva, total,
    paymentMethod: paymentMethod || 'espèces', status: 'complété',
  });

  // Real-time dashboard & finance update
  req.io?.emit('sale:new', { total, items: enrichedItems.length, saleNumber: sale.saleNumber });

  const populated = await Sale.findById(sale._id).populate('items.product', 'name');
  res.status(201).json({ success: true, data: populated, invoiceId: invoice._id });
});

// @desc  Get sales
// @route GET /api/sales
exports.getSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, from, to, cashier, client } = req.query;
  const query = {};
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to);
  }
  if (cashier) query.cashier = cashier;
  if (client)  query.client = client;

  const skip = (page - 1) * limit;
  const [sales, total] = await Promise.all([
    Sale.find(query).populate('client', 'firstName lastName').populate('cashier', 'firstName lastName').sort('-createdAt').skip(skip).limit(+limit),
    Sale.countDocuments(query),
  ]);
  res.json({ success: true, total, page: +page, pages: Math.ceil(total / limit), data: sales });
});

// @desc  Get single sale
// @route GET /api/sales/:id
exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('client', 'firstName lastName phone loyaltyLevel')
    .populate('cashier', 'firstName lastName')
    .populate('items.product', 'name activeIngredient');
  if (!sale) { res.status(404); throw new Error('Vente introuvable'); }
  res.json({ success: true, data: sale });
});

// @desc  Refund sale
// @route POST /api/sales/:id/refund
exports.refundSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) { res.status(404); throw new Error('Vente introuvable'); }
  if (sale.status === 'remboursé') { res.status(400); throw new Error('Déjà remboursé'); }

  // Re-stock items
  for (const item of sale.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const lot = product.lots.find(l => l.lotNumber === item.lotNumber);
      if (lot) lot.quantity += item.quantity;
      else product.lots.push({ lotNumber: item.lotNumber || 'RET', expiryDate: new Date(Date.now() + 365*24*60*60*1000), quantity: item.quantity });
      product.recalcStock();
      await product.save();
    }
  }

  sale.status = 'remboursé';
  await sale.save();

  req.io?.emit('sale:refund', { saleNumber: sale.saleNumber, total: sale.total });
  res.json({ success: true, data: sale });
});

// @desc  Daily sales summary
// @route GET /api/sales/summary/today
exports.getTodaySummary = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);

  const [result] = await Sale.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'complété' } },
    { $group: {
      _id: null,
      total: { $sum: '$total' },
      count: { $sum: 1 },
      avgTicket: { $avg: '$total' },
      tva: { $sum: '$tva' },
    }},
  ]);

  res.json({ success: true, data: result || { total: 0, count: 0, avgTicket: 0, tva: 0 } });
});
