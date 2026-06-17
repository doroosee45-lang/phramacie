const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productName:   { type: String, required: true },
  quantity:      { type: Number, required: true, min: 1 },
  unitPrice:     { type: Number, required: true },
  totalPrice:    { type: Number, required: true },
  receivedQty:   { type: Number, default: 0 },
  lotNumber:     { type: String },
  expiryDate:    { type: Date },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber:   { type: String, unique: true },
  supplier:      { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items:         [orderItemSchema],
  status: {
    type: String,
    enum: ['brouillon','validé','envoyé','en_transit','partiellement_reçu','reçu','annulé'],
    default: 'brouillon'
  },
  expectedDate:  { type: Date },
  receivedDate:  { type: Date },
  subtotal:      { type: Number, default: 0 },
  tva:           { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  notes:         { type: String },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAIGenerated: { type: Boolean, default: false },
  auditLog: [{
    action:    String,
    by:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at:        { type: Date, default: Date.now },
    note:      String,
  }],
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.orderNumber = `BC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  // Recalc totals
  this.subtotal = this.items.reduce((s, i) => s + i.totalPrice, 0);
  this.tva      = this.subtotal * 0.19;
  this.total    = this.subtotal + this.tva;
  next();
});

module.exports = mongoose.model('Order', orderSchema);
