const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    industry: { type: String, default: '' },
    country: { type: String, default: '' },
    region: { type: String, default: '' },
    isHeadquarters: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ userId: 1, storeId: 1 }, { unique: true });

module.exports = mongoose.model('Store', storeSchema);
