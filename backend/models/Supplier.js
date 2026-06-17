const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  code:           { type: String, unique: true, uppercase: true },
  contact:        { name: String, phone: String, email: String },
  address:        { street: String, city: String, wilaya: String, postalCode: String },
  taxId:          { type: String },
  commercialReg:  { type: String },
  paymentTerms:   { type: Number, default: 30 }, // days
  deliveryDelay:  { type: Number, default: 5 },  // days
  creditLimit:    { type: Number, default: 0 },
  balance:        { type: Number, default: 0 },
  qualityScore:   { type: Number, default: 100, min: 0, max: 100 },
  isActive:       { type: Boolean, default: true },
  notes:          { type: String },
}, { timestamps: true });

supplierSchema.index({ name: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
