const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Alert = require('../models/Alert');

// @desc  Get all products
// @route GET /api/products
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, status, search, page = 1, limit = 50, sort = '-createdAt' } = req.query;
  const query = { isActive: true };

  if (category) query.category = category;
  if (search) query.$text = { $search: search };
  if (status === 'rupture') query.stock = 0;
  if (status === 'bas') query.$expr = { $lt: ['$stock', '$minStock'] };
  if (status === 'normal') query.$expr = { $gte: ['$stock', '$minStock'] };

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).populate('supplier', 'name').sort(sort).skip(skip).limit(+limit),
    Product.countDocuments(query),
  ]);

  res.json({ success: true, total, page: +page, pages: Math.ceil(total / limit), data: products });
});

// @desc  Get single product
// @route GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('supplier genericOf');
  if (!product) { res.status(404); throw new Error('Produit introuvable'); }
  res.json({ success: true, data: product });
});

// @desc  Create product
// @route POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// @desc  Update product
// @route PUT /api/products/:id
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) { res.status(404); throw new Error('Produit introuvable'); }
  res.json({ success: true, data: product });
});

// @desc  Delete (deactivate) product
// @route DELETE /api/products/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Produit désactivé' });
});

// @desc  Upload product photo
// @route POST /api/products/:id/image
exports.uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('Aucune image fournie'); }
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Produit introuvable'); }

  const oldImage = product.image;
  product.image = `/uploads/products/${req.file.filename}`;
  await product.save();

  if (oldImage?.startsWith('/uploads/products/')) {
    const oldPath = path.join(__dirname, '..', oldImage);
    fs.unlink(oldPath, () => {});
  }

  res.json({ success: true, data: product });
});

// @desc  Search products (POS)
// @route GET /api/products/search
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });
  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { activeIngredient: { $regex: q, $options: 'i' } },
      { barcode: q },
      { atcCode: { $regex: q, $options: 'i' } },
    ],
  }).limit(20).select('name activeIngredient retailPrice wholesalePrice stock minStock barcode category form dosage lots image');
  res.json({ success: true, data: products });
});

// @desc  Add stock lot (reception)
// @route POST /api/products/:id/lots
exports.addLot = asyncHandler(async (req, res) => {
  const { lotNumber, expiryDate, quantity, location } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Produit introuvable'); }

  const stockBefore = product.stock;
  product.lots.push({ lotNumber, expiryDate, quantity, location });
  product.recalcStock();
  await product.save();

  await StockMovement.create({
    product: product._id, type: 'entrée', quantity,
    lotNumber, expiryDate, stockBefore, stockAfter: product.stock,
    reason: 'Réception', createdBy: req.user._id,
  });

  res.json({ success: true, data: product });
});

// @desc  Get expiring products
// @route GET /api/products/expiring
exports.getExpiringProducts = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const products = await Product.find({
    isActive: true,
    'lots.expiryDate': { $lte: cutoff },
    'lots.quantity': { $gt: 0 },
  }).select('name activeIngredient lots stock');

  res.json({ success: true, data: products });
});

// @desc  Get low stock products
// @route GET /api/products/low-stock
exports.getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$minStock'] },
  }).populate('supplier', 'name').sort({ stock: 1 });
  res.json({ success: true, data: products });
});

// @desc  Adjust stock (inventory)
// @route POST /api/products/:id/adjust
exports.adjustStock = asyncHandler(async (req, res) => {
  const { quantity, reason, lotNumber } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Produit introuvable'); }

  const stockBefore = product.stock;
  const delta = quantity - product.stock;

  if (lotNumber) {
    const lot = product.lots.find(l => l.lotNumber === lotNumber);
    if (lot) lot.quantity = Math.max(0, lot.quantity + delta);
  }
  product.recalcStock();
  await product.save();

  await StockMovement.create({
    product: product._id, type: 'ajustement',
    quantity: delta, stockBefore, stockAfter: product.stock,
    reason: reason || 'Ajustement inventaire', createdBy: req.user._id,
  });

  if (product.stock === 0) {
    await Alert.create({
      type: 'stock_rupture', severity: 'critique',
      title: `Rupture — ${product.name}`,
      message: `Le stock de ${product.name} est à zéro.`,
      product: product._id,
    });
    req.io?.emit('alert:new', { type: 'stock_rupture', product: product.name });
  }

  res.json({ success: true, data: product });
});
