const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    localId: { type: String, required: true, index: true },
    productCode: { type: String, default: '' },
    barcode: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    lastPurchaseUnitPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    categoryId: { type: String, default: '' },
    brandId: { type: String, default: '' },
    parentId: { type: String, default: '' },
    attributeName: { type: String, default: '' },
    attributeValue: { type: String, default: '' },
    attributes: { type: Array, default: [] },
    allowPoints: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    createdAt: { type: Number },
    updatedAt: { type: Number },
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });
productSchema.index(
  { userId: 1, storeId: 1, productCode: 1 },
  { unique: true, partialFilterExpression: { productCode: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.model('Product', productSchema);
