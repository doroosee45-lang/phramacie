const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionNumber: { type: String, unique: true },
  date:         { type: Date, required: true },
  scannedImage: { type: String },
  notes:        { type: String },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionNumber) {
    const count = await this.constructor.countDocuments();
    const year  = new Date().getFullYear();
    this.prescriptionNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
