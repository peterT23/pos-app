const mongoose = require('mongoose');

// Khách hàng chỉ phân biệt theo userId: 1 user (nhiều chi nhánh) dùng chung danh sách khách.
// storeId giữ trong schema để tương thích; khi sync luôn ghi 'default' (dùng chung mọi chi nhánh).
const customerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    storeId: { type: String, required: true, default: 'default', index: true },
    localId: { type: String, required: true, index: true },
    customerCode: { type: String, default: '' },
    name: { type: String, default: '' },
    nickname: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    ward: { type: String, default: '' },
    group: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    email: { type: String, default: '' },
    facebook: { type: String, default: '' },
    note: { type: String, default: '' },
    /** Cá nhân / Doanh nghiệp — import Excel */
    customerType: { type: String, default: '' },
    company: { type: String, default: '' },
    taxId: { type: String, default: '' },
    citizenId: { type: String, default: '' },
    /** Mốc ngày giao dịch cuối (import), timestamp ms */
    lastTransactionAt: { type: Number, default: null },
    /** active | inactive — import / quản lý */
    status: { type: String, default: 'active' },
    points: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    createdAt: { type: Number },
    updatedAt: { type: Number },
  },
  { timestamps: true }
);

customerSchema.index({ userId: 1, storeId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
