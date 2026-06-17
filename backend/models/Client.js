const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true },
  email:        { type: String, lowercase: true, sparse: true },
  dateOfBirth:  { type: Date },
  gender:       { type: String, enum: ['M','F','autre'] },
  address:      { type: String },
  medicalNotes: { type: String },
  allergies:    [{ type: String }],
  chronicConditions: [{ type: String }],

  // Loyalty
  loyaltyPoints:  { type: Number, default: 0 },
  loyaltyLevel:   { type: String, enum: ['bronze','argent','or'], default: 'bronze' },
  totalSpent:     { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  lastVisit:      { type: Date },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

clientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Update loyalty level based on points
clientSchema.methods.updateLoyaltyLevel = function() {
  if (this.loyaltyPoints >= 2000)      this.loyaltyLevel = 'or';
  else if (this.loyaltyPoints >= 500)  this.loyaltyLevel = 'argent';
  else                                  this.loyaltyLevel = 'bronze';
};

// clientSchema.index({ phone: 1 });
clientSchema.index({ firstName: 'text', lastName: 'text' });

module.exports = mongoose.model('Client', clientSchema);
