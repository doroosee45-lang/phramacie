const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['stock_rupture','stock_bas','péremption','commande_retard','paiement_retard','interaction_médicament','anomalie_prix','fraude_suspectée','système'],
    required: true
  },
  severity:     { type: String, enum: ['critique','urgent','info'], default: 'info' },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  isRead:       { type: Boolean, default: false },
  isResolved:   { type: Boolean, default: false },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   { type: Date },
  resolvedNote: { type: String },
  metadata:     { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

alertSchema.index({ isResolved: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
