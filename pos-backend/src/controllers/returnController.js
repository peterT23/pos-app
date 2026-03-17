const mongoose = require('mongoose');
const Return = require('../models/Return');
const ReturnItem = require('../models/ReturnItem');

/**
 * GET /api/returns/:id - Lấy chi tiết một đơn trả hàng theo _id, returnCode hoặc localId
 * Trả về thông tin đầy đủ để hiển thị modal "Chi tiết hóa đơn đổi trả" (returnItems + exchangeItems)
 */
async function getReturn(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const orConditions = [{ returnCode: id }, { localId: id }];
  if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
    orConditions.unshift({ _id: id });
  }

  const record = await Return.findOne({
    $or: orConditions,
    userId: effectiveUserId,
  }).lean();

  if (!record) {
    return res.status(404).json({ message: 'Không tìm thấy đơn trả hàng' });
  }

  const returnItems = await ReturnItem.find({
    userId: effectiveUserId,
    returnLocalId: record.localId,
  }).lean();

  return res.json({
    return: {
      ...record,
      returnCode: record.returnCode || record.localId,
      orderCode: record.orderCode || record.orderLocalId || '',
      exchangeOrderCode: record.exchangeOrderCode || null,
    },
    returnItems: returnItems.map((item) => ({
      productName: item.productName,
      qty: item.qty,
      price: item.price,
      subtotal: item.subtotal,
    })),
    exchangeItems: Array.isArray(record.exchangeItems) ? record.exchangeItems : [],
  });
}

module.exports = {
  getReturn,
};
