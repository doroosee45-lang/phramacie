const asyncHandler = require('express-async-handler');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const User = require('../models/User');
const { sendTokenResponse, generateToken } = require('../utils/tokenUtils');

// @desc  Login
// @route POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { username, password, mfaToken } = req.body;
  if (!username || !password) {
    res.status(400); throw new Error('Identifiant et mot de passe requis');
  }

  const user = await User.findOne({ username }).select('+password +mfaSecret +lockUntil +loginAttempts');
  if (!user) { res.status(401); throw new Error('Identifiants incorrects'); }

  if (user.isLocked) {
    res.status(423);
    throw new Error('Compte verrouillé. Réessayez dans 15 minutes.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    res.status(401); throw new Error('Identifiants incorrects');
  }

  if (user.mfaEnabled) {
    if (!mfaToken) {
      return res.status(200).json({ success: true, requiresMfa: true, userId: user._id });
    }
    const isValid = authenticator.check(mfaToken, user.mfaSecret);
    if (!isValid) { res.status(401); throw new Error('Code MFA invalide'); }
  }

  // Reset login attempts
  await User.findByIdAndUpdate(user._id, { loginAttempts: 0, $unset: { lockUntil: 1 }, lastLogin: new Date() });

  sendTokenResponse(user, 200, res);
});

// @desc  Get current user
// @route GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});

// @desc  Logout
// @route POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// @desc  Change password
// @route PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(oldPassword))) {
    res.status(400); throw new Error('Ancien mot de passe incorrect');
  }
  user.password = newPassword;
  await user.save();
  sendTokenResponse(user, 200, res);
});

// @desc  Setup MFA
// @route POST /api/auth/mfa/setup
exports.setupMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.username, 'PharmaERP', secret);
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
  await User.findByIdAndUpdate(user._id, { mfaSecret: secret });
  res.json({ success: true, data: { qrDataUrl, secret } });
});

// @desc  Verify & enable MFA
// @route POST /api/auth/mfa/verify
exports.verifyMfa = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+mfaSecret');
  const isValid = authenticator.check(token, user.mfaSecret);
  if (!isValid) { res.status(400); throw new Error('Code MFA invalide'); }
  await User.findByIdAndUpdate(user._id, { mfaEnabled: true });
  res.json({ success: true, message: 'MFA activé avec succès' });
});

// @desc  Refresh token
// @route POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(401); throw new Error('Refresh token manquant'); }
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + '_refresh');
    const user = await User.findById(decoded.id);
    if (!user || !user.active) { res.status(401); throw new Error('Utilisateur introuvable'); }
    const token = generateToken(user._id);
    res.json({ success: true, token });
  } catch {
    res.status(401); throw new Error('Refresh token invalide');
  }
});
