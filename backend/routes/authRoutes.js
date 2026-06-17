// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const { login, getMe, logout, changePassword, setupMfa, verifyMfa, refreshToken } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
router.post('/login',           login);
router.post('/refresh',         refreshToken);
router.get('/me',               protect, getMe);
router.post('/logout',          protect, logout);
router.put('/change-password',  protect, changePassword);
router.post('/mfa/setup',       protect, setupMfa);
router.post('/mfa/verify',      protect, verifyMfa);
module.exports = router;
