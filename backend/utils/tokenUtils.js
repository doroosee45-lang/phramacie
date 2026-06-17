const jwt = require('jsonwebtoken');

exports.generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' });

exports.generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET + '_refresh', { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });

exports.sendTokenResponse = (user, statusCode, res) => {
  const token = exports.generateToken(user._id);
  const refreshToken = exports.generateRefreshToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      refreshToken,
      user: {
        _id:       user._id,
        username:  user.username,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        role:      user.role,
        module:    user.module,
        mfaEnabled:user.mfaEnabled,
        avatar:    user.avatar,
        preferences: user.preferences,
      },
    });
};
