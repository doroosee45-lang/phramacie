const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type:       { type: String, enum: ['entrée','sortie','ajustement','inventaire','péremption','retour'], required: true },
  quantity:   { type: Number, required: true },
  lotNumber:  { type: String },
  expiryDate: { type: Date },
  reason:     { type: String },
  reference:  { type: String }, // order number, sale number, etc.
  stockBefore:{ type: Number },
  stockAfter: { type: Number },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
