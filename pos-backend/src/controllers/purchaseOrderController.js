const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

/** Cập nhật tồn kho sản phẩm: tăng/giảm stock theo delta. Ưu tiên productCode để khớp với danh sách hàng hóa (group theo mã). */
async function incProductStock(effectiveUserId, item, delta) {
  const qty = Number(delta) || 0;
  if (qty === 0) return;
  let productCode = String(item.productCode ?? '').trim();
  const productId = item.productId;
  if (!productCode && productId && mongoose.Types.ObjectId.isValid(productId)) {
    const doc = await Product.findOne({ _id: productId, userId: effectiveUserId }).select('productCode').lean();
    if (doc && doc.productCode) productCode = String(doc.productCode).trim();
  }
  if (productCode) {
    const res = await Product.updateMany(
      { userId: effectiveUserId, productCode },
      { $inc: { stock: qty } }
    );
    if (res.modifiedCount > 0) return;
  }
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    await Product.findOneAndUpdate(
      { _id: productId, userId: effectiveUserId },
      { $inc: { stock: qty } }
    );
  }
}

/**
 * Cập nhật giá vốn trung bình khi nhập hàng:
 * giá_vốn_mới = (tồn_cũ * giá_vốn_cũ + số_lượng_nhập * đơn_giá_nhập_sau_chiết_khấu) / (tồn_cũ + số_lượng_nhập)
 * Đơn giá nhập sau chiết khấu = đơn giá - giảm giá (per unit).
 */
async function updateProductAverageCost(effectiveUserId, item, quantity) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return;
  const unitPrice = Number(item.unitPrice) || 0;
  const discountPerUnit = Number(item.discount) || 0;
  const effectiveUnitPrice = Math.max(0, unitPrice - discountPerUnit);

  let productCode = String(item.productCode ?? '').trim();
  let productId = item.productId;
  if (!productCode && productId && mongoose.Types.ObjectId.isValid(productId)) {
    const doc = await Product.findOne({ _id: productId, userId: effectiveUserId }).select('productCode').lean();
    if (doc && doc.productCode) productCode = String(doc.productCode).trim();
  }

  let product = null;
  if (productCode) {
    product = await Product.findOne({ userId: effectiveUserId, productCode }).select('stock costPrice').lean();
  }
  if (!product && productId && mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findOne({ _id: productId, userId: effectiveUserId }).select('stock costPrice').lean();
  }
  if (!product) return;

  const oldStock = Number(product.stock) || 0;
  const oldCost = Number(product.costPrice) || 0;
  const totalQty = oldStock + qty;
  if (totalQty <= 0) return;
  const newTotalValue = oldStock * oldCost + qty * effectiveUnitPrice;
  const newAvgCost = Math.round(newTotalValue / totalQty);

  const updateFilter = productCode
    ? { userId: effectiveUserId, productCode }
    : { _id: productId, userId: effectiveUserId };
  const unitPriceFromOrder = Number(item.unitPrice) || 0;
  await Product.updateMany(updateFilter, {
    $set: {
      costPrice: newAvgCost,
      lastPurchaseUnitPrice: unitPriceFromOrder,
    },
  });
}

async function getNextPurchaseOrderCode(userId) {
  const last = await PurchaseOrder.findOne({ userId, code: /^PN\d+$/ })
    .sort({ code: -1 })
    .select('code')
    .lean();
  const n = last && last.code ? parseInt(last.code.replace(/\D/g, ''), 10) : 0;
  return `PN${String(n + 1).padStart(6, '0')}`;
}

async function listPurchaseOrders(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { userId: queryUserId, status, dateFrom, dateTo, creatorId, receiverId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const filter = { userId: effectiveUserId };

  const statusList = status ? status.split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (statusList && statusList.length > 0) {
    filter.status = { $in: statusList };
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
  }
  if (creatorId) filter.creatorId = creatorId;
  if (receiverId) filter.receiverId = receiverId;

  const orders = await PurchaseOrder.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ purchaseOrders: orders });
}

async function getPurchaseOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const order = await PurchaseOrder.findOne({ _id: id, userId: effectiveUserId }).lean();
  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
  }
  return res.json({ purchaseOrder: order });
}

async function createPurchaseOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { userId: queryUserId, ...body } = req.body || {};
  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const {
    code,
    supplierId,
    supplierCode,
    supplierName,
    amountToPay,
    status,
    creatorId,
    receiverId,
    notes,
    items: itemsRaw,
  } = body;

  let finalCode = String(code || '').trim();
  if (!finalCode) {
    finalCode = await getNextPurchaseOrderCode(effectiveUserId);
  }

  let supplierCodeStr = String(supplierCode ?? '').trim();
  let supplierNameStr = String(supplierName ?? '').trim();
  if (supplierId) {
    const supplier = await Supplier.findOne({ _id: supplierId, userId: effectiveUserId }).lean();
    if (supplier) {
      if (!supplierCodeStr) supplierCodeStr = supplier.code || '';
      if (!supplierNameStr) supplierNameStr = supplier.name || '';
    }
  }

  const normalizedItems = Array.isArray(itemsRaw)
    ? itemsRaw.map((it) => {
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
        return {
          productId,
          productCode: String(it.productCode ?? '').trim(),
          productName: String(it.productName ?? '').trim(),
          unit: String(it.unit ?? '').trim(),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          amount: Number(it.amount) || 0,
          note: String(it.note ?? '').trim(),
        };
      })
    : [];

  const finalStatus = status === 'received' ? 'received' : status === 'cancelled' ? 'cancelled' : 'draft';

  const created = await PurchaseOrder.create({
    userId: effectiveUserId,
    code: finalCode,
    supplierId: supplierId || null,
    supplierCode: supplierCodeStr,
    supplierName: supplierNameStr,
    amountToPay: Number(amountToPay) || 0,
    status: finalStatus,
    creatorId: String(creatorId || effectiveUserId).trim(),
    receiverId: String(receiverId || '').trim(),
    notes: String(notes || '').trim(),
    items: normalizedItems,
  });

  if (finalStatus === 'received' && normalizedItems.length > 0) {
    for (const item of normalizedItems) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      await updateProductAverageCost(effectiveUserId, item, qty);
      await incProductStock(effectiveUserId, item, qty);
    }
    created.stockUpdated = true;
    await created.save();
  }

  return res.status(201).json({ purchaseOrder: created });
}

async function updatePurchaseOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const body = req.body || {};
  const effectiveUserId = role === 'system_admin' && body.userId ? body.userId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const order = await PurchaseOrder.findOne({ _id: id, userId: effectiveUserId });
  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
  }

  const previousStatus = order.status;
  const oldItems = Array.isArray(order.items) ? order.items.map((it) => ({
    productId: it.productId ? String(it.productId) : null,
    productCode: String(it.productCode ?? '').trim(),
    quantity: Number(it.quantity) || 0,
  })) : [];

  const allowed = ['supplierId', 'supplierCode', 'supplierName', 'amountToPay', 'status', 'creatorId', 'receiverId', 'notes', 'code'];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'supplierId') order.supplierId = body[key] || null;
      else if (key === 'amountToPay') order.amountToPay = Number(body[key]) || 0;
      else if (key === 'status') order.status = ['draft', 'received', 'cancelled'].includes(body[key]) ? body[key] : order.status;
      else if (key === 'code') order.code = String(body[key] || '').trim();
      else order[key] = String(body[key] ?? '').trim();
    }
  }

  if (Array.isArray(body.items)) {
    order.items = body.items.map((it) => {
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
      return {
        productId,
        productCode: String(it.productCode ?? '').trim(),
        productName: String(it.productName ?? '').trim(),
        unit: String(it.unit ?? '').trim(),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        amount: Number(it.amount) || 0,
        note: String(it.note ?? '').trim(),
      };
    });
  }

  if (order.supplierId) {
    const supplier = await Supplier.findOne({ _id: order.supplierId, userId: effectiveUserId }).lean();
    if (supplier) {
      if (!order.supplierCode) order.supplierCode = supplier.code || '';
      if (!order.supplierName) order.supplierName = supplier.name || '';
    }
  }

  const transitionToReceived = previousStatus === 'draft' && order.status === 'received';
  const alreadyReceivedEdit = previousStatus === 'received' && order.status === 'received';

  await order.save();

  // Phiếu đã "Đã nhập hàng" và tồn đã cập nhật trước đó (đã bấm Hoàn thành): chỉ báo đã hoàn thành, không cập nhật tồn lại.
  if (alreadyReceivedEdit && order.stockUpdated) {
    return res.json({ purchaseOrder: order.toObject ? order.toObject() : order, alreadyCompleted: true });
  }

  if (transitionToReceived && order.items && order.items.length > 0) {
    for (const item of order.items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      await updateProductAverageCost(effectiveUserId, item, qty);
      await incProductStock(effectiveUserId, item, qty);
    }
    order.stockUpdated = true;
    await order.save();
  }

  // Phiếu đã "received" nhưng tồn chưa được cộng (trước đó bấm Lưu tạm): cộng tồn theo số lượng trong phiếu.
  const receivedButNoPreviousItems =
    alreadyReceivedEdit && !order.stockUpdated && oldItems.length === 0 && order.items && order.items.length > 0;
  if (receivedButNoPreviousItems) {
    for (const item of order.items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      await updateProductAverageCost(effectiveUserId, item, qty);
      await incProductStock(effectiveUserId, item, qty);
    }
    order.stockUpdated = true;
    await order.save();
  }

  if (alreadyReceivedEdit && !order.stockUpdated && oldItems.length > 0 && (order.items && order.items.length > 0)) {
    const oldByKey = new Map();
    for (const it of oldItems) {
      const key = it.productId ? `id:${it.productId}` : `code:${it.productCode}`;
      oldByKey.set(key, (oldByKey.get(key) || 0) + it.quantity);
    }
    const newByKey = new Map();
    const newItemsByKey = new Map();
    for (const it of order.items || []) {
      const key = it.productId ? `id:${String(it.productId)}` : `code:${String(it.productCode || '').trim()}`;
      newByKey.set(key, (newByKey.get(key) || 0) + (Number(it.quantity) || 0));
      newItemsByKey.set(key, it);
    }
    const allKeys = new Set([...oldByKey.keys(), ...newByKey.keys()]);
    for (const key of allKeys) {
      const oldQty = oldByKey.get(key) || 0;
      const newQty = newByKey.get(key) || 0;
      const delta = newQty - oldQty;
      if (delta === 0) continue;
      const item = newItemsByKey.get(key) || (key.startsWith('id:')
        ? { productId: key.slice(3), productCode: '', unitPrice: 0, discount: 0 }
        : { productId: null, productCode: key.slice(5), unitPrice: 0, discount: 0 });
      if (delta > 0) {
        await updateProductAverageCost(effectiveUserId, item, delta);
      }
      await incProductStock(effectiveUserId, item, delta);
    }
    order.stockUpdated = true;
    await order.save();
  }

  return res.json({ purchaseOrder: order.toObject ? order.toObject() : order });
}

async function deletePurchaseOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};
  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const deleted = await PurchaseOrder.findOneAndDelete({ _id: id, userId: effectiveUserId });
  if (!deleted) {
    return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
  }
  return res.json({ message: 'Đã xóa phiếu nhập hàng' });
}

module.exports = {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
};
