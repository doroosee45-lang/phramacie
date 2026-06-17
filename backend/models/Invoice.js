const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  type:          { type: String, enum: ['vente','b2b','avoir','proforma'], default: 'vente' },
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:    { type: String },
  clientAddress: { type: String },
  clientTax:     { type: String },
  sale:          { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  order:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  items: [{
    description: String,
    quantity:    Number,
    unitPrice:   Number,
    tvaRate:     { type: Number, default: 19 },
    total:       Number,
  }],
  subtotal:    { type: Number, required: true },
  tva:         { type: Number, default: 0 },
  total:       { type: Number, required: true },
  status:      { type: String, enum: ['émise','payée','partiellement_payée','en_retard','annulée'], default: 'émise' },
  dueDate:     { type: Date },
  paidAt:      { type: Date },
  paidAmount:  { type: Number, default: 0 },
  paymentMethod: String,
  notes:       { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode:      { type: String },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
}, { timestamps: true });

invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year  = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `FAC-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  if (!this.dueDate) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    this.dueDate = d;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
