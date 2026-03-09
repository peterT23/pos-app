const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productCode: { type: String, default: '' },
    productName: { type: String, default: '' },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    code: { type: String, default: '', index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierCode: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    amountToPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'received', 'cancelled'],
      default: 'draft',
    },
    /** Đã cập nhật tồn kho (khi Hoàn thành hoặc khi bấm Lưu ở chi tiết phiếu). Dùng để biết đã hoàn thành hay chỉ lưu tạm. */
    stockUpdated: { type: Boolean, default: false },
    creatorId: { type: String, default: '' },
    receiverId: { type: String, default: '' },
    notes: { type: String, default: '' },
    items: { type: [purchaseOrderItemSchema], default: [] },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ userId: 1, createdAt: -1 });
purchaseOrderSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
