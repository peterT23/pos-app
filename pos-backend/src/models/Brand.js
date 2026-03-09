const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

brandSchema.index({ userId: 1, storeId: 1, name: 1 }, { unique: false });

module.exports = mongoose.model('Brand', brandSchema);
