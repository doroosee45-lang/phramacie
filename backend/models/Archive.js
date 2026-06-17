const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
  operationType: { type: String, enum: ['vente'], default: 'vente' },
  sale:          { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  saleNumber:    { type: String, required: true },
  performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String },
  performedByRole: { type: String },
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  itemsCount:    { type: Number, default: 0 },
  subtotal:      { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  tva:           { type: Number, default: 0 },
  total:         { type: Number, required: true },
  paymentMethod: { type: String },
  status:        { type: String, default: 'complété' },
  archivedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

archiveSchema.index({ archivedAt: -1 });
archiveSchema.index({ performedBy: 1, archivedAt: -1 });

module.exports = mongoose.model('Archive', archiveSchema);
