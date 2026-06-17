const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  pharmacyName:    { type: String, default: 'Omedev Pharma' },
  address:         { type: String, default: '' },
  phone:           { type: String, default: '' },
  email:           { type: String, default: '' },
  taxId:           { type: String, default: '' },
  tvaRate:         { type: Number, default: 19 },
  currency:        { type: String, default: 'CDF' },
  invoiceFooter:   { type: String, default: 'Merci de votre confiance.' },
  updatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Singleton accessor — there is always exactly one settings document
settingsSchema.statics.getSingleton = async function() {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
