const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:          { type: String },
  quantity:      { type: Number, required: true, min: 1 },
  unitPrice:     { type: Number, required: true },
  discount:      { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
  lotNumber:     { type: String },
}, { _id: true });

const saleSchema = new mongoose.Schema({
  saleNumber:    { type: String, unique: true },
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  prescription:  { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  items:         [saleItemSchema],
  subtotal:      { type: Number, required: true },
  discount:      { type: Number, default: 0 },
  tva:           { type: Number, default: 0 },
  total:         { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['espèces','carte','mobile_money','chèque','crédit','virement'],
    default: 'espèces'
  },
  amountPaid:    { type: Number },
  change:        { type: Number, default: 0 },
  status:        { type: String, enum: ['complété','remboursé','annulé'], default: 'complété' },
  loyaltyPoints: { type: Number, default: 0 },
  pointsUsed:    { type: Number, default: 0 },
  cashier:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isOffline:     { type: Boolean, default: false },
  syncedAt:      { type: Date },
  notes:         { type: String },
}, { timestamps: true });

saleSchema.pre('save', async function(next) {
  if (!this.saleNumber) {
    const year  = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments();
    this.saleNumber = `VTE-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  this.loyaltyPoints = Math.floor(this.total / 100);
  next();
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ client: 1, createdAt: -1 });
saleSchema.index({ cashier: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
