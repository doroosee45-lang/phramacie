const asyncHandler = require('express-async-handler');
const Archive = require('../models/Archive');

// @desc  List archived sale operations — SuperAdmin only
// @route GET /api/archive
exports.getArchives = asyncHandler(async (req, res) => {
  const { from, to, performedBy, page = 1, limit = 30 } = req.query;
  const q = {};
  if (performedBy) q.performedBy = performedBy;
  if (from || to) {
    q.archivedAt = {};
    if (from) q.archivedAt.$gte = new Date(from);
    if (to)   q.archivedAt.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    Archive.find(q).populate('client', 'firstName lastName').sort('-archivedAt').skip((page - 1) * limit).limit(+limit),
    Archive.countDocuments(q),
  ]);
  res.json({ success: true, total, page: +page, pages: Math.ceil(total / limit), data });
});

// @desc  Archive summary stats — SuperAdmin only
// @route GET /api/archive/summary
exports.getArchiveSummary = asyncHandler(async (req, res) => {
  const [byRole, total] = await Promise.all([
    Archive.aggregate([{ $group: { _id: '$performedByRole', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Archive.countDocuments(),
  ]);
  res.json({ success: true, data: { total, byRole } });
});
