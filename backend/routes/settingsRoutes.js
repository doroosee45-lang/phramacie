const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

r.use(protect);
r.get('/', ctrl.getSettings);
r.put('/', authorize('super_admin', 'admin'), ctrl.updateSettings);

module.exports = r;
