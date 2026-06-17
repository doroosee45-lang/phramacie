const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');

// @desc  Get application settings
// @route GET /api/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ success: true, data: settings });
});

// @desc  Update application settings
// @route PUT /api/settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { pharmacyName, address, phone, email, taxId, tvaRate, invoiceFooter } = req.body;
  Object.assign(settings, {
    ...(pharmacyName !== undefined && { pharmacyName }),
    ...(address !== undefined && { address }),
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
    ...(taxId !== undefined && { taxId }),
    ...(tvaRate !== undefined && { tvaRate }),
    ...(invoiceFooter !== undefined && { invoiceFooter }),
    updatedBy: req.user._id,
  });
  await settings.save();
  res.json({ success: true, data: settings });
});
