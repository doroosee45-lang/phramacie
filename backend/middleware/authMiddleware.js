const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token) {
    res.status(401);
    throw new Error('Non autorisé — token manquant');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.active) {
      res.status(401); throw new Error('Compte désactivé');
    }
    next();
  } catch {
    res.status(401); throw new Error('Token invalide ou expiré');
  }
});

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Accès refusé — rôle requis : ${roles.join(', ')}`);
  }
  next();
};

exports.authorizeModule = (...modules) => (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  if (!modules.includes(req.user.module)) {
    res.status(403); throw new Error('Accès refusé — module non autorisé');
  }
  next();
};
