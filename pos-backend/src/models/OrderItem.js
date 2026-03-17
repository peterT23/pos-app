const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    localId: { type: String, required: true, index: true },
    orderLocalId: { type: String, required: true, index: true },
    productLocalId: { type: String, required: true, index: true },
    productName: { type: String, default: '' },
    basePrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, default: 'vnd' },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

orderItemSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);
