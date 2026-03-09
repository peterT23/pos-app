const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    localId: { type: String, required: true, index: true },
    orderCode: { type: String, index: true },
    totalAmount: { type: Number, default: 0 },
    subtotalAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, default: 'vnd' },
    paymentMethod: { type: String, default: 'cash' },
    cashierId: { type: String, default: '' },
    cashierName: { type: String, default: '' },
    customerLocalId: { type: String, default: null },
    customerPhone: { type: String, default: null },
    pointsUsed: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    status: { type: String, default: 'completed' },
    createdAt: { type: Number },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);
