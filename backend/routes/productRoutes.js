// ============================================================
// routes/productRoutes.js
// ============================================================
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
r.use(protect);
r.get('/search',      ctrl.searchProducts);
r.get('/expiring',    ctrl.getExpiringProducts);
r.get('/low-stock',   ctrl.getLowStock);
r.route('/').get(ctrl.getProducts).post(authorize('super_admin','admin'), ctrl.createProduct);
r.route('/:id').get(ctrl.getProduct).put(authorize('super_admin','admin'), ctrl.updateProduct).delete(authorize('super_admin','admin'), ctrl.deleteProduct);
r.post('/:id/image',  authorize('super_admin','admin'), upload.single('image'), ctrl.uploadProductImage);
r.post('/:id/lots',   authorize('super_admin','admin'), ctrl.addLot);
r.post('/:id/adjust', authorize('super_admin','admin'), ctrl.adjustStock);
module.exports = r;
