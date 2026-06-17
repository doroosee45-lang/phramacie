const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  lotNumber:  { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity:   { type: Number, required: true, min: 0 },
  location:   { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  activeIngredient:{ type: String, required: true, trim: true }, // DCI
  atcCode:         { type: String, trim: true, uppercase: true },
  barcode:         { type: String, unique: true, sparse: true },
  form:            { type: String, enum: ['comprimé','gélule','sirop','injectable','pommade','suppositoire','patch','gouttes','spray','autre'], default: 'comprimé' },
  dosage:          { type: String },
  packaging:       { type: String },
  category: {
    type: String,
    enum: ['antibiotique','antalgique','cardiovasculaire','gastroentérologie','diabète','neurologie','respiratoire','dermatologie','ophtalmologie','parapharmacie','dispositif_médical','autre'],
    required: true
  },
  requiresPrescription: { type: Boolean, default: false },
  isControlled:    { type: Boolean, default: false },
  genericOf:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },

  // Stock
  lots:            [lotSchema],
  stock:           { type: Number, default: 0 },
  minStock:        { type: Number, default: 0 },
  maxStock:        { type: Number, default: 1000 },
  location:        { type: String, default: '' },

  // Prices
  purchasePrice:   { type: Number, required: true, min: 0 },
  wholesalePrice:  { type: Number, required: true, min: 0 },
  retailPrice:     { type: Number, required: true, min: 0 },
  tvaRate:         { type: Number, default: 19 },

  supplier:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  isActive:        { type: Boolean, default: true },
  image:           { type: String },
  notes:           { type: String },
}, { timestamps: true });

// Indexes
productSchema.index({ name: 'text', activeIngredient: 'text', atcCode: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ stock: 1, minStock: 1 });

// Virtual: stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'rupture';
  if (this.stock < this.minStock) return 'bas';
  return 'normal';
});

// Virtual: nearest expiry
productSchema.virtual('nearestExpiry').get(function() {
  if (!this.lots.length) return null;
  return this.lots.reduce((min, lot) =>
    lot.expiryDate < min ? lot.expiryDate : min, this.lots[0].expiryDate
  );
});

// Update stock from lots
productSchema.methods.recalcStock = function() {
  this.stock = this.lots.reduce((sum, lot) => sum + lot.quantity, 0);
};

module.exports = mongoose.model('Product', productSchema);
