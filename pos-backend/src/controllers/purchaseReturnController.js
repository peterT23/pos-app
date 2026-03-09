const mongoose = require('mongoose');
const PurchaseReturn = require('../models/PurchaseReturn');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

async function getNextPurchaseReturnCode(userId) {
  const last = await PurchaseReturn.findOne({ userId, code: /^TH\d+$/ })
    .sort({ code: -1 })
    .select('code')
    .lean();
  const n = last && last.code ? parseInt(last.code.replace(/\D/g, ''), 10) : 0;
  return `TH${String(n + 1).padStart(6, '0')}`;
}

async function createPurchaseReturn(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const body = req.body || {};
  const effectiveUserId = role === 'system_admin' && body.userId ? body.userId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const { purchaseOrderId, supplierId, supplierCode, supplierName, notes, items: itemsRaw, status } = body;

  const order = await PurchaseOrder.findOne({ _id: purchaseOrderId, userId: effectiveUserId }).lean();
  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
  }

  let code = String(body.code || '').trim();
  if (!code) {
    code = await getNextPurchaseReturnCode(effectiveUserId);
  }

  let supplierCodeStr = String(supplierCode ?? order.supplierCode ?? '').trim();
  let supplierNameStr = String(supplierName ?? order.supplierName ?? '').trim();
  const finalSupplierId = supplierId || order.supplierId || null;
  if (finalSupplierId) {
    const supplier = await Supplier.findOne({ _id: finalSupplierId, userId: effectiveUserId }).lean();
    if (supplier) {
      if (!supplierCodeStr) supplierCodeStr = supplier.code || '';
      if (!supplierNameStr) supplierNameStr = supplier.name || '';
    }
  }

  const normalizedItems = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter((it) => (Number(it.quantity) || 0) > 0)
        .map((it) => {
          let productId = it.productId;
          if (productId != null && productId !== '') {
            const str = String(productId).trim();
            if (str && mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str) {
              productId = new mongoose.Types.ObjectId(str);
            } else {
              productId = null;
            }
          } else {
            productId = null;
          }
          const qty = Number(it.quantity) || 0;
          const unitPrice = Number(it.unitPrice) || 0;
          const amount = qty * unitPrice;
          return {
            productId,
            productCode: String(it.productCode ?? '').trim(),
            productName: String(it.productName ?? '').trim(),
            unit: String(it.unit ?? '').trim(),
            quantity: qty,
            unitPrice,
            amount,
            note: String(it.note ?? '').trim(),
          };
        })
    : [];

  const amountToPay = normalizedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const finalStatus = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'draft';

  const created = await PurchaseReturn.create({
    userId: effectiveUserId,
    purchaseOrderId: order._id,
    code,
    supplierId: finalSupplierId,
    supplierCode: supplierCodeStr,
    supplierName: supplierNameStr,
    amountToPay,
    status: finalStatus,
    notes: String(notes ?? '').trim(),
    items: normalizedItems,
  });

  if (finalStatus === 'completed' && normalizedItems.length > 0) {
    for (const item of normalizedItems) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      if (item.productId) {
        await Product.findOneAndUpdate(
          { _id: item.productId, userId: effectiveUserId },
          { $inc: { stock: -qty } }
        );
      } else if (item.productCode) {
        await Product.updateMany(
          { userId: effectiveUserId, productCode: item.productCode },
          { $inc: { stock: -qty } }
        );
      }
    }
  }

  return res.status(201).json({ purchaseReturn: created });
}

module.exports = {
  createPurchaseReturn,
};
