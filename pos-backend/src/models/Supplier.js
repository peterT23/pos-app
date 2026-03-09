const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, default: '', index: true },
    code: { type: String, default: '' },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    ward: { type: String, default: '' },
    group: { type: String, default: '' },
    notes: { type: String, default: '' },
    companyName: { type: String, default: '' },
    taxCode: { type: String, default: '' },
    currentDebt: { type: Number, default: 0 },
    totalPurchase: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

supplierSchema.index({ userId: 1 });
supplierSchema.index({ userId: 1, code: 1 }, { unique: false });

module.exports = mongoose.model('Supplier', supplierSchema);
