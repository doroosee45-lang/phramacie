const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Alert = require('../models/Alert');
const StockMovement = require('../models/StockMovement');

// @desc  Main dashboard KPIs
// @route GET /api/dashboard/kpis
exports.getKPIs = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth()-1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const [
    todaySales, yesterdaySales, monthSales, lastMonthSales,
    totalStock, lowStockCount, ruptureCount, expiringCount,
    activeAlerts, pendingOrders, newClientsToday
  ] = await Promise.all([
    Sale.aggregate([{ $match: { createdAt: { $gte: today, $lte: todayEnd }, status: 'complété' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: yesterday, $lt: today }, status: 'complété' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: thisMonth }, status: 'complété' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd }, status: 'complété' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$purchasePrice'] } }, count: { $sum: 1 } } }]),
    Product.countDocuments({ isActive: true, $expr: { $and: [{ $gt: ['$stock', 0] }, { $lt: ['$stock', '$minStock'] }] } }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.countDocuments({ isActive: true, 'lots.expiryDate': { $lte: new Date(Date.now() + 30*24*60*60*1000) }, 'lots.quantity': { $gt: 0 } }),
    Alert.countDocuments({ isResolved: false }),
    Order.countDocuments({ status: { $in: ['validé','envoyé','en_transit'] } }),
    Client.countDocuments({ createdAt: { $gte: today } }),
  ]);

  const todayTotal  = todaySales[0]?.total || 0;
  const yestTotal   = yesterdaySales[0]?.total || 0;
  const monthTotal  = monthSales[0]?.total || 0;
  const lmTotal     = lastMonthSales[0]?.total || 0;
  const stockValue  = totalStock[0]?.value || 0;
  const productCount= totalStock[0]?.count || 0;

  res.json({ success: true, data: {
    sales: {
      today: todayTotal,
      todayCount: todaySales[0]?.count || 0,
      todayVsYesterday: yestTotal ? ((todayTotal - yestTotal) / yestTotal * 100).toFixed(1) : 0,
      month: monthTotal,
      monthCount: monthSales[0]?.count || 0,
      monthVsLast: lmTotal ? ((monthTotal - lmTotal) / lmTotal * 100).toFixed(1) : 0,
    },
    stock: { value: stockValue, productCount, lowStock: lowStockCount, rupture: ruptureCount, expiring: expiringCount },
    alerts: activeAlerts,
    orders: { pending: pendingOrders },
    clients: { newToday: newClientsToday },
  }});
});

// @desc  Sales chart data
// @route GET /api/dashboard/sales-chart
exports.getSalesChart = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const from = new Date();
  from.setDate(from.getDate() - parseInt(days));
  from.setHours(0,0,0,0);

  const data = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      total: { $sum: '$total' },
      count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data });
});

// @desc  Category breakdown
// @route GET /api/dashboard/category-chart
exports.getCategoryChart = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { status: 'complété' };
  if (from) match.createdAt = { $gte: new Date(from) };
  if (to)   match.createdAt = { ...match.createdAt, $lte: new Date(to) };

  const data = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: '$prod' },
    { $group: { _id: '$prod.category', total: { $sum: '$items.totalPrice' }, count: { $sum: '$items.quantity' } } },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, data });
});

// @desc  Top products
// @route GET /api/dashboard/top-products
exports.getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 10, days = 30 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - parseInt(days));

  const data = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' } } },
    { $sort: { revenue: -1 } },
    { $limit: parseInt(limit) },
  ]);

  res.json({ success: true, data });
});

// @desc  Stock movements chart
// @route GET /api/dashboard/stock-movements
exports.getStockMovements = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - parseInt(days));

  const data = await StockMovement.aggregate([
    { $match: { createdAt: { $gte: from } } },
    { $group: {
      _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' },
      qty: { $sum: { $abs: '$quantity' } },
    }},
    { $sort: { '_id.date': 1 } },
  ]);

  res.json({ success: true, data });
});

// @desc  Revenue by payment method
// @route GET /api/dashboard/payment-methods
exports.getPaymentMethods = asyncHandler(async (req, res) => {
  const from = new Date(); from.setDate(from.getDate() - 30);
  const data = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  res.json({ success: true, data });
});
