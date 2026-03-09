const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    localId: { type: String, required: true, index: true },
    returnLocalId: { type: String, required: true, index: true },
    productLocalId: { type: String, required: true, index: true },
    productName: { type: String, default: '' },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

returnItemSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('ReturnItem', returnItemSchema);
