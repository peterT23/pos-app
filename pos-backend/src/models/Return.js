const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    localId: { type: String, required: true, index: true },
    returnCode: { type: String, default: '' },
    orderLocalId: { type: String, default: '' },
    orderCode: { type: String, default: '' },
    exchangeOrderLocalId: { type: String, default: '' },
    exchangeOrderCode: { type: String, default: '' },
    cashierId: { type: String, default: '' },
    cashierName: { type: String, default: '' },
    customerLocalId: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    totalReturnAmount: { type: Number, default: 0 },
    totalExchangeAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: '' },
    amountPaid: { type: Number, default: 0 },
    createdAt: { type: Number },
    exchangeItems: { type: Array, default: [] },
    /** Điểm cộng/trừ khi trả/đổi (đồng bộ từ POS) */
    pointsDelta: { type: Number, default: 0 },
    pointsAddedExchange: { type: Number, default: 0 },
    pointsDeductedReturn: { type: Number, default: 0 },
  },
  { timestamps: true }
);

returnSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('Return', returnSchema);
