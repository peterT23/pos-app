const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

settingSchema.index({ userId: 1, storeId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Setting', settingSchema);
