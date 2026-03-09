const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    parentId: { type: String, default: '' },
    level: { type: Number, default: 1 },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, storeId: 1, name: 1, parentId: 1 }, { unique: false });

module.exports = mongoose.model('Category', categorySchema);
