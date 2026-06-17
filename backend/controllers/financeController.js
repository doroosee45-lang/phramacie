const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');

// @desc  Financial summary — auto reflects every completed sale
// @route GET /api/finance/summary
exports.getFinanceSummary = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const buildMatch = (from) => ({ createdAt: { $gte: from, $lte: todayEnd }, status: 'complété' });

  const aggregate = (from) => Sale.aggregate([
    { $match: buildMatch(from) },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: null,
      revenue: { $sum: '$items.totalPrice' },
      cost: { $sum: { $multiply: [{ $ifNull: ['$prod.purchasePrice', 0] }, '$items.quantity'] } },
      qty: { $sum: '$items.quantity' },
    }},
  ]);

  const [today_, week, month, year, refunds] = await Promise.all([
    aggregate(today),
    aggregate(weekStart),
    aggregate(monthStart),
    aggregate(yearStart),
    Sale.aggregate([
      { $match: { status: 'remboursé', updatedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
  ]);

  const shape = (r) => {
    const revenue = r[0]?.revenue || 0;
    const cost = r[0]?.cost || 0;
    return { revenue, cost, profit: revenue - cost, margin: revenue ? +((revenue - cost) / revenue * 100).toFixed(1) : 0, qty: r[0]?.qty || 0 };
  };

  res.json({ success: true, data: {
    today: shape(today_),
    week: shape(week),
    month: shape(month),
    year: shape(year),
    refunds: { total: refunds[0]?.total || 0, count: refunds[0]?.count || 0 },
  }});
});

// @desc  Profit trend chart (revenue vs cost per day)
// @route GET /api/finance/trend
exports.getFinanceTrend = asyncHandler(async (req, res) => {
  const { days = 14 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - parseInt(days)); from.setHours(0,0,0,0);

  const data = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$items.totalPrice' },
      cost: { $sum: { $multiply: [{ $ifNull: ['$prod.purchasePrice', 0] }, '$items.quantity'] } },
    }},
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: data.map(d => ({ date: d._id, revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost })) });
});

// @desc  Recent transactions ledger
// @route GET /api/finance/ledger
exports.getFinanceLedger = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [data, total] = await Promise.all([
    Sale.find({ status: { $in: ['complété', 'remboursé'] } })
      .populate('cashier', 'firstName lastName')
      .populate('client', 'firstName lastName')
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit),
    Sale.countDocuments({ status: { $in: ['complété', 'remboursé'] } }),
  ]);
  res.json({ success: true, total, page: +page, pages: Math.ceil(total / limit), data });
});
