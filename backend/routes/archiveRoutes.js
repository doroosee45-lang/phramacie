const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/archiveController');
const { protect, authorize } = require('../middleware/authMiddleware');

r.use(protect);
r.use(authorize('super_admin'));
r.get('/', ctrl.getArchives);
r.get('/summary', ctrl.getArchiveSummary);

module.exports = r;
