const mongoose = require('mongoose');

const supplierGroupSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

supplierGroupSchema.index({ userId: 1, storeId: 1 });
supplierGroupSchema.index({ userId: 1, storeId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SupplierGroup', supplierGroupSchema);
