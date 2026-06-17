const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

r.use(protect);
r.use(authorize('super_admin', 'admin'));
r.get('/summary', ctrl.getFinanceSummary);
r.get('/trend',   ctrl.getFinanceTrend);
r.get('/ledger',  ctrl.getFinanceLedger);

module.exports = r;
