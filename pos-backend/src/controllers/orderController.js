const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Return = require('../models/Return');
const ReturnItem = require('../models/ReturnItem');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Store = require('../models/Store');
const mongoose = require('mongoose');

function buildTimeRange(preset, dateFrom, dateTo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;
  let end;

  if (preset && preset !== 'custom') {
    switch (preset) {
      case 'today':
        start = new Date(today);
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start = new Date(today);
        start.setDate(start.getDate() + diff);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'lastWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start = new Date(today);
        start.setDate(start.getDate() + diff - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'last7days':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last30days':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisQuarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        const startMonth = (q - 1) * 3;
        start = new Date(now.getFullYear(), startMonth, 1);
        end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'lastQuarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        const prevQ = q <= 1 ? 4 : q - 1;
        const y = q <= 1 ? now.getFullYear() - 1 : now.getFullYear();
        const startMonth = (prevQ - 1) * 3;
        start = new Date(y, startMonth, 1);
        end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    return { start: start.getTime(), end: end.getTime() };
  }

  if (dateFrom && dateTo) {
    start = new Date(dateFrom);
    start.setHours(0, 0, 0, 0);
    end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }

  start = new Date(now.getFullYear(), 0, 1);
  end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function buildStoreFilter(storeId, storeScope, userId, stores) {
  if (storeId) return { storeId };
  if (storeScope && storeScope !== 'all' && stores && stores.length > 0) {
    const hq = stores.filter((s) => s.isHeadquarters).map((s) => s.storeId);
    const hqIds = hq.length > 0 ? hq : [stores[0].storeId];
    const branchIds = stores.map((s) => s.storeId).filter((id) => !hqIds.includes(id));
    const target = storeScope === 'hq' ? hqIds : branchIds;
    return target.length > 0 ? { storeId: { $in: target } } : {};
  }
  return {};
}

async function listOrders(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const {
    timePreset = 'thisYear',
    dateFrom,
    dateTo,
    status,
    storeId,
    storeScope = 'all',
    userId: queryUserId,
    search,
    limit = 50,
    skip = 0,
  } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let storeFilter = {};
  if (storeId) {
    storeFilter = { storeId };
  } else if (storeScope && storeScope !== 'all') {
    const stores = await Store.find({ userId: effectiveUserId }).sort({ createdAt: 1 }).lean();
    storeFilter = buildStoreFilter(null, storeScope, effectiveUserId, stores);
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }

  const { start, end } = buildTimeRange(timePreset, dateFrom, dateTo);
  const filter = {
    userId: effectiveUserId,
    createdAt: { $gte: start, $lte: end },
    ...storeFilter,
  };
  if (status) {
    const statusArr = Array.isArray(status) ? status : (typeof status === 'string' ? status.split(',').map((s) => s.trim()).filter(Boolean) : [status]);
    if (statusArr.length > 0) filter.status = { $in: statusArr };
  }
  if (search && typeof search === 'string' && search.trim()) {
    filter.$or = [
      { orderCode: { $regex: search.trim(), $options: 'i' } },
      { localId: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const take = Math.min(Number(limit) || 50, 200);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(Number(skip) || 0)
    .limit(take)
    .lean();

  const orderCodes = orders.map((o) => o.orderCode).filter(Boolean);
  const orderLocalIds = orders.map((o) => o.localId).filter(Boolean);
  const returnsByOrderCode = new Map();
  if (orderCodes.length > 0 || orderLocalIds.length > 0) {
    const returnFilter = {
      userId: effectiveUserId,
      $or: [
        ...(orderCodes.length > 0 ? [{ orderCode: { $in: orderCodes } }] : []),
        ...(orderLocalIds.length > 0 ? [{ orderLocalId: { $in: orderLocalIds } }] : []),
      ],
    };
    const returns = await Return.find(returnFilter).lean();
    returns.forEach((r) => {
      const code = r.returnCode || r.localId;
      const keysToAdd = new Set();
      if (r.orderCode) keysToAdd.add(r.orderCode);
      const orderByLocalId = orders.find((o) => o.localId === r.orderLocalId);
      if (orderByLocalId) {
        if (orderByLocalId.orderCode) keysToAdd.add(orderByLocalId.orderCode);
        if (orderByLocalId.localId) keysToAdd.add(orderByLocalId.localId);
      }
      keysToAdd.forEach((key) => {
        if (!returnsByOrderCode.has(key)) returnsByOrderCode.set(key, []);
        const arr = returnsByOrderCode.get(key);
        if (!arr.includes(code)) arr.push(code);
      });
    });
  }

  const customerLocalIds = [...new Set(orders.map((o) => o.customerLocalId).filter(Boolean))];
  const customerPhones = [
    ...new Set(
      orders
        .filter((o) => !o.customerLocalId)
        .map((o) => o.customerPhone)
        .filter(Boolean)
    ),
  ];
  const customerMapByLocalId = new Map();
  const customerMapByPhone = new Map();
  if (customerLocalIds.length > 0 || customerPhones.length > 0) {
    const customers = await Customer.find({
      userId: effectiveUserId,
      $or: [
        ...(customerLocalIds.length > 0 ? [{ localId: { $in: customerLocalIds } }] : []),
        ...(customerPhones.length > 0 ? [{ phone: { $in: customerPhones } }] : []),
      ],
    }).lean();
    customers.forEach((c) => {
      if (c.localId) customerMapByLocalId.set(c.localId, { customerCode: c.customerCode || '', name: c.name || '' });
      if (c.phone) customerMapByPhone.set(c.phone, { customerCode: c.customerCode || '', name: c.name || '' });
    });
  }

  const list = orders.map((order) => {
    const returnCodes = returnsByOrderCode.get(order.orderCode || order.localId) || [];
    const cust = order.customerLocalId
      ? customerMapByLocalId.get(order.customerLocalId)
      : (order.customerPhone ? customerMapByPhone.get(order.customerPhone) : null);
    return {
      _id: order._id,
      localId: order.localId,
      orderCode: order.orderCode || order.localId,
      createdAt: order.createdAt,
      returnCodes,
      customerCode: cust?.customerCode || order.customerLocalId || '',
      customerName: cust?.name || 'Khách lẻ',
      totalAmount: Number(order.totalAmount) || 0,
      discount: Number(order.discount) || 0,
      status: order.status || 'completed',
      cashierName: order.cashierName || '',
      storeId: order.storeId,
    };
  });

  const total = await Order.countDocuments(filter);
  return res.json({ orders: list, total });
}

/**
 * Chỉ lấy OrderItem của đúng một chi nhánh — không gộp default + chi nhánh
 * (tránh double sau sync / replaceOrder chỉ xóa theo storeId của HĐ).
 */
async function findOrderItemsForInvoice(userId, orderLocalId, orderStoreId) {
  const sid = orderStoreId || 'default';

  let rows = await OrderItem.find({
    userId,
    orderLocalId,
    storeId: sid,
  }).lean();

  if (rows.length === 0 && sid !== 'default') {
    rows = await OrderItem.find({
      userId,
      orderLocalId,
      storeId: 'default',
    }).lean();
  }

  if (rows.length === 0) {
    const all = await OrderItem.find({ userId, orderLocalId }).lean();
    if (all.length === 0) return [];
    const byStore = new Map();
    for (const it of all) {
      const s = it.storeId || 'default';
      if (!byStore.has(s)) byStore.set(s, []);
      byStore.get(s).push(it);
    }
    if (byStore.has(sid)) {
      rows = byStore.get(sid);
    } else if (byStore.has('default')) {
      rows = byStore.get('default');
    } else {
      rows = Array.from(byStore.values())[0];
    }
  }

  return rows;
}

/** Trùng sync: cùng mã phiếu hoặc cùng localId */
function dedupeReturnDocuments(docs) {
  const seenLocal = new Set();
  const seenCode = new Set();
  const sorted = [...docs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const out = [];
  for (const r of sorted) {
    const lid = String(r.localId || '').trim();
    const code = String(r.returnCode || '').trim();
    if (lid && seenLocal.has(lid)) continue;
    if (code && seenCode.has(code)) continue;
    if (lid) seenLocal.add(lid);
    if (code) seenCode.add(code);
    out.push(r);
  }
  return out;
}

function orderItemUpdatedMs(it) {
  const u = it.updatedAt;
  if (u instanceof Date) return u.getTime();
  if (typeof u === 'number' && u > 1e12) return u;
  if (typeof u === 'string') {
    const t = new Date(u).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  const c = it.createdAt;
  if (c instanceof Date) return c.getTime();
  if (typeof c === 'number') return c;
  return 0;
}

/**
 * Cùng SP nhiều dòng (sync lỗi / replace không xóa hết): KHÔNG cộng dồn — giữ bản mới nhất.
 */
function mergeOrderItemsByProductLatest(rows) {
  const byPid = new Map();
  for (const item of rows) {
    const key = String(item.productLocalId || '').trim() || String(item._id || '');
    if (!key) continue;
    const t = orderItemUpdatedMs(item);
    const prev = byPid.get(key);
    if (!prev) {
      byPid.set(key, { item, t });
      continue;
    }
    if (t > prev.t) {
      byPid.set(key, { item, t });
    } else if (t === prev.t) {
      const li = String(item.localId || '');
      const lp = String(prev.item.localId || '');
      if (li > lp) byPid.set(key, { item, t });
    }
  }
  return Array.from(byPid.values()).map(({ item }) => ({
    ...item,
    qty: Number(item.qty) || 0,
    subtotal: Number(item.subtotal) || 0,
    price: Number(item.price) || 0,
  }));
}

/**
 * Khi chỉ 1 dòng hàng nhưng tổng thành tiền lệch so với (tiền HĐ hiện tại + tổng trả), chỉnh qty/subtotal cho khớp tiền thật.
 */
function reconcileSingleLineInvoiceWithMoney(order, returnsDeduped, invoiceLines) {
  if (!Array.isArray(invoiceLines) || invoiceLines.length !== 1) return invoiceLines;
  const retMoney = returnsDeduped.reduce((s, r) => s + (Number(r.totalReturnAmount) || 0), 0);
  const sub = Number(order.subtotalAmount);
  const tot = Number(order.totalAmount);
  const baseGoods = !Number.isNaN(sub) && sub > 0 ? sub : tot;
  if (Number.isNaN(baseGoods) || baseGoods < 0) return invoiceLines;
  const impliedOriginal = baseGoods + retMoney;
  if (impliedOriginal <= 0) return invoiceLines;

  const disc = Number(order.discount) || 0;
  if (disc > 0) {
    return invoiceLines;
  }

  const lineSum = invoiceLines.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  if (Math.abs(lineSum - impliedOriginal) < 500) return invoiceLines;

  const it = { ...invoiceLines[0] };
  const unit = Number(it.price) || 0;
  if (unit <= 0) return invoiceLines;
  const qty = Math.round(impliedOriginal / unit);
  if (qty <= 0) return invoiceLines;
  const recomputed = qty * unit;
  if (Math.abs(recomputed - impliedOriginal) > unit * 0.5) return invoiceLines;

  it.qty = qty;
  it.subtotal = recomputed;
  return [it];
}

/** Gộp dòng ReturnItem trùng (cùng phiếu + cùng SP) */
function aggregateReturnItemsForInvoice(rows) {
  const m = new Map();
  for (const ri of rows) {
    const pid = String(ri.productLocalId || '').trim();
    const rloc = String(ri.returnLocalId || '').trim();
    if (!pid || !rloc) continue;
    const key = `${rloc}::${pid}`;
    const q = Number(ri.qty) || 0;
    const st = Number(ri.subtotal) || 0;
    const pr = Number(ri.price) || 0;
    const ex = m.get(key);
    if (ex) {
      ex.qty += q;
      ex.subtotal += st;
    } else {
      m.set(key, {
        ...ri,
        productLocalId: pid,
        returnLocalId: rloc,
        qty: q,
        subtotal: st,
        price: pr,
        productName: ri.productName || '',
      });
    }
  }
  return Array.from(m.values());
}

async function getOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const orderOr = [{ localId: id }, { orderCode: id }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orderOr.unshift({ _id: id });
  }

  const order = await Order.findOne({
    $or: orderOr,
    userId: effectiveUserId,
  }).lean();

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  const items = await findOrderItemsForInvoice(
    effectiveUserId,
    order.localId,
    order.storeId,
  );

  const [returnsRaw, customer] = await Promise.all([
    Return.find({
      userId: effectiveUserId,
      $or: [
        { orderCode: order.orderCode || order.localId },
        { orderLocalId: order.localId },
      ],
    }).lean(),
    order.customerLocalId
      ? Customer.findOne({ userId: effectiveUserId, localId: order.customerLocalId }).lean()
      : (order.customerPhone
        ? Customer.findOne({ userId: effectiveUserId, phone: order.customerPhone }).lean()
        : Promise.resolve(null)),
  ]);

  const returns = dedupeReturnDocuments(returnsRaw);

  // Trùng productLocalId: giữ bản OrderItem mới nhất (không cộng dồn — tránh 20+20=40)
  const mergedItems = mergeOrderItemsByProductLatest(items);

  const returnLocalIds = returns.map((r) => r.localId).filter(Boolean);
  let allReturnItems = [];
  if (returnLocalIds.length > 0) {
    allReturnItems = await ReturnItem.find({
      userId: effectiveUserId,
      returnLocalId: { $in: returnLocalIds },
    }).lean();
  }
  const returnItemsAgg = aggregateReturnItemsForInvoice(allReturnItems);

  /** Dòng hàng ước tính tại thời điểm bán: cộng lại SL đã trả (vì replaceOrder có thể đã ghi đè còn lại) */
  function buildInvoiceLineItems(merged, returnRows) {
    const byPid = new Map();
    for (const it of merged) {
      const pid = String(it.productLocalId || '').trim() || String(it._id || '');
      if (!pid) continue;
      byPid.set(pid, {
        ...it,
        productLocalId: pid,
        qty: Number(it.qty) || 0,
        subtotal: Number(it.subtotal) || 0,
        price: Number(it.price) || 0,
        productName: it.productName || '',
        basePrice: Number(it.basePrice) || Number(it.price) || 0,
        discount: Number(it.discount) || 0,
        discountType: it.discountType === 'percent' ? 'percent' : 'vnd',
      });
    }
    for (const ri of returnRows) {
      const pid = String(ri.productLocalId || '').trim();
      if (!pid) continue;
      const q = Number(ri.qty) || 0;
      const st = Number(ri.subtotal) || 0;
      const pr = Number(ri.price) || 0;
      const ex = byPid.get(pid);
      if (ex) {
        ex.qty += q;
        ex.subtotal += st;
        if (!ex.productName && ri.productName) ex.productName = ri.productName;
      } else {
        byPid.set(pid, {
          productLocalId: pid,
          productName: ri.productName || '',
          qty: q,
          price: pr,
          basePrice: pr,
          discount: 0,
          discountType: 'vnd',
          subtotal: st,
        });
      }
    }
    return Array.from(byPid.values());
  }

  let invoiceMerged = buildInvoiceLineItems(mergedItems, returnItemsAgg);
  invoiceMerged = reconcileSingleLineInvoiceWithMoney(order, returns, invoiceMerged);

  const productLocalIds = [
    ...new Set([
      ...mergedItems.map((i) => i.productLocalId).filter(Boolean),
      ...invoiceMerged.map((i) => i.productLocalId).filter(Boolean),
    ]),
  ];
  const products = await Product.find({
    userId: effectiveUserId,
    localId: { $in: productLocalIds },
    $or: [{ storeId: order.storeId }, { storeId: 'default' }],
  }).lean();
  const productByLocalId = new Map();
  for (const p of products) {
    const id = p.localId;
    const prev = productByLocalId.get(id);
    if (!prev || (prev.storeId !== order.storeId && p.storeId === order.storeId)) {
      productByLocalId.set(id, p);
    }
  }
  const codeOnly = (localId) => {
    const p = productByLocalId.get(localId);
    return (p && (p.productCode || p.localId)) || localId;
  };

  const returnCodes = returns.map((r) => r.returnCode || r.localId);
  const returnIdByCode = new Map(returns.map((r) => [r.returnCode || r.localId, r._id.toString()]));

  const orderItems = mergedItems.map((item) => ({
    ...item,
    productCode: codeOnly(item.productLocalId),
    returnId: returnCodes.length > 0 ? returnIdByCode.get(returnCodes[0]) : null,
  }));

  const invoiceLineItems = invoiceMerged.map((item) => ({
    ...item,
    productCode: codeOnly(item.productLocalId),
    returnId: returnCodes.length > 0 ? returnIdByCode.get(returnCodes[0]) : null,
  }));

  const invoiceGoodsSubtotal = invoiceLineItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

  return res.json({
    order: {
      ...order,
      orderCode: order.orderCode || order.localId,
      customerCode: customer?.customerCode || order.customerLocalId || '',
      customerName: customer?.name || order.customerPhone || 'Khách lẻ',
      returnCodes,
      returnIds: returns.map((r) => r._id.toString()),
    },
    items: orderItems,
    invoiceLineItems,
    invoiceGoodsSubtotal,
  });
}

async function deleteOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const orderOr = [{ localId: id }, { orderCode: id }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orderOr.unshift({ _id: id });
  }

  const order = await Order.findOne({
    $or: orderOr,
    userId: effectiveUserId,
  });

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  order.status = 'cancelled';
  await order.save();

  return res.json({ message: 'Đã hủy hóa đơn', order: { _id: order._id, status: order.status } });
}

async function updateOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const body = req.body || {};
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const orderOr = [{ localId: id }, { orderCode: id }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orderOr.unshift({ _id: id });
  }

  const order = await Order.findOne({
    $or: orderOr,
    userId: effectiveUserId,
  });

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  if (body.note !== undefined) order.note = String(body.note).slice(0, 1000);
  await order.save();

  return res.json({ message: 'Đã cập nhật đơn hàng', order: order.toObject() });
}

function generateItemLocalId() {
  return `oi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function replaceOrder(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const body = req.body || {};
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const orderOr = [{ localId: id }, { orderCode: id }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orderOr.unshift({ _id: id });
  }

  const order = await Order.findOne({
    $or: orderOr,
    userId: effectiveUserId,
  });

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return res.status(400).json({ message: 'Hóa đơn trống' });
  }

  const subtotalAmount = Number(body.subtotalAmount);
  const totalAmount = Number(body.totalAmount);
  if (Number.isNaN(subtotalAmount) || subtotalAmount < 0 || Number.isNaN(totalAmount) || totalAmount < 0) {
    return res.status(400).json({ message: 'Tổng tiền không hợp lệ' });
  }

  order.subtotalAmount = subtotalAmount;
  order.totalAmount = totalAmount;
  order.discount = Number(body.discount) || 0;
  order.discountType = body.discountType === 'percent' ? 'percent' : 'vnd';
  if (typeof body.paymentMethod === 'string') order.paymentMethod = body.paymentMethod;
  if (body.customerLocalId !== undefined) order.customerLocalId = body.customerLocalId || null;
  if (body.customerPhone !== undefined) order.customerPhone = body.customerPhone || null;
  if (body.note !== undefined) order.note = String(body.note).slice(0, 1000);
  // Cập nhật người thao tác chỉnh sửa
  order.cashierId = req.user?.sub || order.cashierId;
  order.cashierName = req.user?.name || order.cashierName;
  order.status = 'completed';

  // Replace toàn bộ order items của orderLocalId
  await OrderItem.deleteMany({
    userId: effectiveUserId,
    storeId: order.storeId,
    orderLocalId: order.localId,
  });

  const docs = items.map((it) => ({
    userId: effectiveUserId,
    storeId: order.storeId,
    localId: generateItemLocalId(),
    orderLocalId: order.localId,
    productLocalId: String(it.productLocalId || '').trim(),
    productName: String(it.productName || '').trim(),
    basePrice: Number(it.basePrice) || 0,
    discount: Number(it.discount) || 0,
    discountType: it.discountType === 'percent' ? 'percent' : 'vnd',
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 0,
    subtotal: Number(it.subtotal) || 0,
  }));

  await OrderItem.insertMany(docs, { ordered: true });
  await order.save();

  return res.json({ message: 'Đã cập nhật hóa đơn', order: order.toObject() });
}

module.exports = {
  listOrders,
  getOrder,
  deleteOrder,
  updateOrder,
  replaceOrder,
};
