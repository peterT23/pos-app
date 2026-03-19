const mongoose = require('mongoose');
const Return = require('../models/Return');
const ReturnItem = require('../models/ReturnItem');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

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
    storeId: record.storeId,
    returnLocalId: record.localId,
  }).lean();

  const customer = record.customerLocalId
    ? await Customer.findOne({ userId: effectiveUserId, localId: record.customerLocalId }).lean()
    : (record.customerPhone
      ? await Customer.findOne({ userId: effectiveUserId, phone: record.customerPhone }).lean()
      : null);

  const productLocalIds = [...new Set(returnItems.map((i) => String(i.productLocalId || '').trim()).filter(Boolean))];
  const products = productLocalIds.length > 0
    ? await Product.find({ userId: effectiveUserId, storeId: record.storeId, localId: { $in: productLocalIds } }).lean()
    : [];
  const productByLocalId = new Map(products.map((p) => [p.localId, p]));

  return res.json({
    return: {
      ...record,
      returnCode: record.returnCode || record.localId,
      orderCode: record.orderCode || record.orderLocalId || '',
      exchangeOrderCode: record.exchangeOrderCode || null,
      customerCode: customer?.customerCode || record.customerLocalId || '',
      customerName: customer?.name || record.customerPhone || 'Khách lẻ',
      customerPhone: record.customerPhone || '',
    },
    returnItems: returnItems.map((item) => ({
      productLocalId: item.productLocalId,
      productCode: productByLocalId.get(item.productLocalId)?.productCode || '',
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
