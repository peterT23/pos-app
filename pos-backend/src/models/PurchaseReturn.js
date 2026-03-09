const mongoose = require('mongoose');

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productCode: { type: String, default: '' },
    productName: { type: String, default: '' },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    code: { type: String, default: '', index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierCode: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    amountToPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'completed', 'cancelled'],
      default: 'draft',
    },
    notes: { type: String, default: '' },
    items: { type: [purchaseReturnItemSchema], default: [] },
  },
  { timestamps: true }
);

purchaseReturnSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
