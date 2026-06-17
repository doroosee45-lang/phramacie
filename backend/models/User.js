const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:     { type: String, required: true, minlength: 6, select: false },
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  phone:        { type: String },
  role: {
    type: String,
    enum: ['super_admin','admin','pharmacist'],
    default: 'pharmacist'
  },
  module:       { type: String, enum: ['global','pharmacy'], default: 'pharmacy' },
  mfaEnabled:   { type: Boolean, default: false },
  mfaSecret:    { type: String, select: false },
  active:       { type: Boolean, default: true },
  lastLogin:    { type: Date },
  loginAttempts:{ type: Number, default: 0 },
  lockUntil:    { type: Date },
  refreshToken: { type: String, select: false },
  avatar:       { type: String },
  preferences:  {
    language:   { type: String, default: 'fr' },
    theme:      { type: String, enum: ['dark','light'], default: 'dark' },
    notifications: { type: Boolean, default: true },
  },
}, { timestamps: true });

// Virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
    return;
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 };
  }
  await this.updateOne(updates);
};

module.exports = mongoose.model('User', userSchema);
