const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Return = require('../models/Return');
const Store = require('../models/Store');
const mongoose = require('mongoose');
const crypto = require('crypto');

async function buildStoreFilter(req) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, storeScope = 'all' } = req.query || {};
  let storeFilter = {};
  if (storeId) {
    storeFilter = { storeId };
  } else if (storeScope && storeScope !== 'all') {
    const stores = await Store.find({ userId }).sort({ createdAt: 1 }).lean();
    const hq = stores.filter((s) => s.isHeadquarters);
    const hqIds = hq.length > 0 ? hq.map((s) => s.storeId) : (stores[0] ? [stores[0].storeId] : []);
    const branchIds = stores.map((s) => s.storeId).filter((id) => !hqIds.includes(id));
    const target = storeScope === 'hq' ? hqIds : branchIds;
    storeFilter = target.length > 0 ? { storeId: { $in: target } } : {};
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }
  return { userId, role, storeFilter };
}

/**
 * Tiền trả theo từng hóa đơn (gắn orderLocalId hoặc orderCode).
 * Mỗi phiếu trả chỉ cộng vào một key để tránh trùng.
 */
function buildReturnSumByOrderKey(returns) {
  const map = new Map();
  for (const r of returns) {
    const amt = Number(r.totalReturnAmount) || 0;
    if (r.orderLocalId) {
      const k = `L:${String(r.orderLocalId)}`;
      map.set(k, (map.get(k) || 0) + amt);
    } else if (r.orderCode) {
      const k = `C:${String(r.orderCode)}`;
      map.set(k, (map.get(k) || 0) + amt);
    }
  }
  return map;
}

function getReturnSumForOrder(order, returnSumByOrderKey) {
  if (order.localId && returnSumByOrderKey.has(`L:${String(order.localId)}`)) {
    return returnSumByOrderKey.get(`L:${String(order.localId)}`) || 0;
  }
  if (order.orderCode && returnSumByOrderKey.has(`C:${String(order.orderCode)}`)) {
    return returnSumByOrderKey.get(`C:${String(order.orderCode)}`) || 0;
  }
  return 0;
}

/** Gộp doanh số gốc (gross) và sau trả (net) theo khách — theo customerLocalId hoặc customerPhone trên HĐ */
function accumulateOrderSalesByCustomer(orders, returnSumByOrderKey) {
  const grossByLocal = new Map();
  const netByLocal = new Map();
  const grossByPhone = new Map();
  const netByPhone = new Map();

  for (const o of orders) {
    const ret = getReturnSumForOrder(o, returnSumByOrderKey);
    const net = Number(o.totalAmount) || 0;
    const gross = net + ret;
    if (o.customerLocalId) {
      const id = String(o.customerLocalId);
      grossByLocal.set(id, (grossByLocal.get(id) || 0) + gross);
      netByLocal.set(id, (netByLocal.get(id) || 0) + net);
    } else if (o.customerPhone) {
      const ph = String(o.customerPhone);
      grossByPhone.set(ph, (grossByPhone.get(ph) || 0) + gross);
      netByPhone.set(ph, (netByPhone.get(ph) || 0) + net);
    }
  }
  return { grossByLocal, netByLocal, grossByPhone, netByPhone };
}

function accumulateReturnTotalsByCustomer(returns) {
  const retByLocal = new Map();
  const retByPhone = new Map();
  for (const r of returns) {
    const amt = Number(r.totalReturnAmount) || 0;
    if (r.customerLocalId) {
      const id = String(r.customerLocalId);
      retByLocal.set(id, (retByLocal.get(id) || 0) + amt);
    } else if (r.customerPhone) {
      const ph = String(r.customerPhone);
      retByPhone.set(ph, (retByPhone.get(ph) || 0) + amt);
    }
  }
  return { retByLocal, retByPhone };
}

async function loadCustomerSalesMetrics(userId, storeFilter) {
  const orderQuery = { userId, status: 'completed', ...storeFilter };
  const returnQuery = { userId, ...storeFilter };
  const [orders, returns] = await Promise.all([
    Order.find(orderQuery).lean(),
    Return.find(returnQuery).lean(),
  ]);
  const returnSumByOrderKey = buildReturnSumByOrderKey(returns);
  const { grossByLocal, netByLocal, grossByPhone, netByPhone } = accumulateOrderSalesByCustomer(
    orders,
    returnSumByOrderKey,
  );
  const { retByLocal, retByPhone } = accumulateReturnTotalsByCustomer(returns);
  return {
    grossByLocal,
    netByLocal,
    grossByPhone,
    netByPhone,
    retByLocal,
    retByPhone,
  };
}

/**
 * totalSales: tổng bán gốc (tiền HĐ hiện tại + tiền đã trả gắn các HĐ của khách)
 * netSales: tổng bán sau trả (= tổng Order.totalAmount hiện tại)
 * totalReturns: tổng phiếu trả theo khách (tham khảo)
 */
function attachTotals(c, metrics) {
  const {
    grossByLocal, netByLocal, grossByPhone, netByPhone, retByLocal, retByPhone,
  } = metrics;
  const gid = String(c.localId);
  const phone = c.phone ? String(c.phone) : '';
  const totalSales =
    (grossByLocal.get(gid) || 0) + (phone ? (grossByPhone.get(phone) || 0) : 0);
  const netSales =
    (netByLocal.get(gid) || 0) + (phone ? (netByPhone.get(phone) || 0) : 0);
  const totalReturns =
    (retByLocal.get(gid) || 0) + (phone ? (retByPhone.get(phone) || 0) : 0);
  return {
    ...c,
    totalSales,
    totalReturns,
    netSales,
  };
}

async function resolveCustomerDoc(userId, storeFilter, id) {
  const q = { userId, ...storeFilter };
  const or = [{ localId: id }];
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
    or.push({ _id: id });
  }
  let doc = await Customer.findOne({ ...q, $or: or }).lean();
  if (!doc && Object.keys(storeFilter).length) {
    doc = await Customer.findOne({ userId, $or: or }).lean();
  }
  if (!doc) doc = await Customer.findOne({ userId, $or: or }).lean();
  return doc;
}

async function listCustomers(req, res) {
  try {
    const { userId, role, storeFilter } = await buildStoreFilter(req);
    if (!userId) return res.status(400).json({ message: 'Thiếu thông tin người dùng' });

    const effectiveUserId = role === 'system_admin' && req.query.userId ? req.query.userId : userId;

    const {
      page = 1,
      limit = 15,
      q = '',
      debtMin,
      debtMax,
      pointsMin,
      pointsMax,
      createdFrom,
      createdTo,
      group = '',
      area = '',
    } = req.query;

    const filter = { userId: effectiveUserId };
    if (storeFilter.storeId) {
      const sid = storeFilter.storeId;
      if (typeof sid === 'string') {
        filter.storeId = { $in: [...new Set([sid, 'default'])] };
      } else if (sid.$in && Array.isArray(sid.$in)) {
        filter.storeId = { $in: [...new Set([...sid.$in, 'default'])] };
      } else {
        Object.assign(filter, storeFilter);
      }
    }
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: rx },
        { phone: rx },
        { customerCode: rx },
      ];
    }
    const dmin = debtMin !== undefined && debtMin !== '' ? Number(debtMin) : null;
    const dmax = debtMax !== undefined && debtMax !== '' ? Number(debtMax) : null;
    if (dmin !== null && !Number.isNaN(dmin)) filter.debt = { ...filter.debt, $gte: dmin };
    if (dmax !== null && !Number.isNaN(dmax)) filter.debt = { ...filter.debt, $lte: dmax };

    const pmin = pointsMin !== undefined && pointsMin !== '' ? Number(pointsMin) : null;
    const pmax = pointsMax !== undefined && pointsMax !== '' ? Number(pointsMax) : null;
    if (pmin !== null && !Number.isNaN(pmin)) filter.points = { ...filter.points, $gte: pmin };
    if (pmax !== null && !Number.isNaN(pmax)) filter.points = { ...filter.points, $lte: pmax };

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom).setHours(0, 0, 0, 0);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo).setHours(23, 59, 59, 999);
    }
    if (group && String(group).trim()) filter.group = new RegExp(String(group).trim(), 'i');
    if (area && String(area).trim()) filter.area = new RegExp(String(area).trim(), 'i');

    const take = Math.min(Math.max(Number(limit) || 15, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, rows, totalsAgg, salesMetrics] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      Customer.aggregate([
        { $match: filter },
        { $group: { _id: null, sumDebt: { $sum: '$debt' }, sumPoints: { $sum: '$points' } } },
      ]),
      loadCustomerSalesMetrics(effectiveUserId, storeFilter),
    ]);

    const items = rows.map((c) => attachTotals(c, salesMetrics));

    const t = totalsAgg[0] || {};
    res.json({
      items,
      total,
      page: Number(page) || 1,
      limit: take,
      summary: {
        sumDebt: t.sumDebt || 0,
        sumPoints: t.sumPoints || 0,
        pageSumDebt: items.reduce((s, c) => s + (Number(c.debt) || 0), 0),
        pageSumPoints: items.reduce((s, c) => s + (Number(c.points) || 0), 0),
        pageSumSales: items.reduce((s, c) => s + (Number(c.totalSales) || 0), 0),
        pageSumNet: items.reduce((s, c) => s + (Number(c.netSales) || 0), 0),
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi tải danh sách khách hàng' });
  }
}

async function getCustomer(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });

    const salesMetrics = await loadCustomerSalesMetrics(doc.userId, { storeId: doc.storeId });
    const enriched = attachTotals(doc, salesMetrics);
    res.json(enriched);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi' });
  }
}

async function customerOrders(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy' });

    const or = [{ customerLocalId: doc.localId }];
    if (doc.phone) or.push({ customerPhone: doc.phone, $or: [{ customerLocalId: null }, { customerLocalId: '' }] });

    const orders = await Order.find({
      userId: doc.userId,
      ...storeFilter,
      status: 'completed',
      $or: or,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(orders);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi' });
  }
}

async function customerReturns(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy' });

    const or = [{ customerLocalId: doc.localId }];
    if (doc.phone) or.push({ customerPhone: doc.phone });

    const returns = await Return.find({
      userId: doc.userId,
      ...storeFilter,
      $or: or,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(returns);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi' });
  }
}

/** Gộp hóa đơn + trả hàng theo thời gian (tab nợ / lịch sử) */
async function customerLedger(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy' });

    const or = [{ customerLocalId: doc.localId }];
    if (doc.phone) or.push({ customerPhone: doc.phone, $or: [{ customerLocalId: null }, { customerLocalId: '' }] });

    const [orders, returns] = await Promise.all([
      Order.find({
        userId: doc.userId,
        ...storeFilter,
        status: 'completed',
        $or: or,
      })
        .sort({ createdAt: 1 })
        .limit(500)
        .lean(),
      Return.find({ userId: doc.userId, ...storeFilter, $or: [{ customerLocalId: doc.localId }, ...(doc.phone ? [{ customerPhone: doc.phone }] : [])] })
        .sort({ createdAt: 1 })
        .limit(500)
        .lean(),
    ]);

    const rows = [];
    orders.forEach((o) => {
      rows.push({
        code: o.orderCode || o.localId,
        time: o.createdAt,
        type: 'Bán hàng',
        value: o.totalAmount || 0,
        kind: 'order',
      });
    });
    returns.forEach((r) => {
      rows.push({
        code: r.returnCode || r.localId,
        time: r.createdAt,
        type: 'Trả hàng',
        value: -(r.totalReturnAmount || 0),
        kind: 'return',
      });
    });
    rows.sort((a, b) => (a.time || 0) - (b.time || 0));
    let balance = 0;
    const withBalance = rows.map((r) => {
      balance += r.value;
      return { ...r, balance };
    });

    res.json(withBalance.reverse());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi' });
  }
}

/** Lịch sử điểm: mua hàng (+) và trả/đổi hàng (+/−) theo thời gian */
async function customerPointsHistory(req, res) {
  try {
    const POINTS_PER_VND = 50000;
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy' });

    const custOr = [{ customerLocalId: doc.localId }];
    if (doc.phone) custOr.push({ customerPhone: doc.phone });

    const orderMatch = {
      userId: doc.userId,
      $or: custOr,
      pointsEarned: { $gt: 0 },
    };
    const returnMatch = {
      userId: doc.userId,
      $or: custOr,
      pointsDelta: { $ne: 0 },
    };

    if (storeFilter.storeId) {
      const sid = storeFilter.storeId;
      const ids = typeof sid === 'string' ? [sid, 'default'] : [...(sid.$in || []), 'default'];
      const merged = [...new Set(ids)];
      orderMatch.storeId = { $in: merged };
      returnMatch.storeId = { $in: merged };
    }

    const [orders, retArr] = await Promise.all([
      Order.find(orderMatch).sort({ createdAt: 1 }).limit(400).lean(),
      Return.find(returnMatch).sort({ createdAt: 1 }).limit(400).lean(),
    ]);

    const events = [];
    orders.forEach((o) => {
      const pts = Number(o.pointsEarned) || 0;
      if (pts) {
        events.push({
          t: o.createdAt,
          code: o.orderCode || o.localId,
          type: 'Mua hàng',
          pointsDelta: pts,
          // Hiển thị giá trị HĐ tương ứng với điểm đã cộng (tránh lệch khi order.totalAmount đã bị cập nhật sau trả một phần)
          orderTotal: pts * POINTS_PER_VND,
        });
      }
    });
    retArr.forEach((r) => {
      const pd = Number(r.pointsDelta) || 0;
      if (pd) {
        events.push({
          t: r.createdAt,
          code: r.returnCode || r.localId,
          type: 'Trả / đổi hàng',
          pointsDelta: pd,
          // Hiển thị giá trị HĐ tương ứng với điểm trừ/cộng (đảm bảo cùng rounding với POS)
          orderTotal: pd * POINTS_PER_VND,
        });
      }
    });

    events.sort((a, b) => (a.t || 0) - (b.t || 0));
    let bal = 0;
    const rows = events.map((e) => {
      bal += e.pointsDelta;
      return {
        code: e.code,
        time: e.t,
        type: e.type,
        orderTotal: e.orderTotal,
        pointsDelta: e.pointsDelta,
        balanceAfter: bal,
      };
    });
    res.json(rows.reverse());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Lỗi' });
  }
}

async function createCustomer(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    if (!userId) return res.status(400).json({ message: 'Thiếu user' });

    const storeId = req.body.storeId || (storeFilter.storeId && (typeof storeFilter.storeId === 'string' ? storeFilter.storeId : req.user?.storeIds?.[0])) || 'default';

    const localId = `cust_${crypto.randomBytes(8).toString('hex')}`;
    const now = Date.now();
    const body = req.body || {};

    const doc = await Customer.create({
      userId,
      storeId,
      localId,
      customerCode: body.customerCode || '',
      name: body.name || '',
      phone: body.phone || '',
      address: body.address || '',
      area: body.area || '',
      ward: body.ward || '',
      group: body.group || '',
      email: body.email || '',
      note: body.note || '',
      gender: body.gender || '',
      dateOfBirth: body.dateOfBirth || '',
      customerType: body.customerType || '',
      company: body.company || '',
      taxId: body.taxId || '',
      citizenId: body.citizenId || '',
      facebook: body.facebook || '',
      lastTransactionAt: body.lastTransactionAt != null ? Number(body.lastTransactionAt) : null,
      status: body.status || 'active',
      points: Number(body.points) || 0,
      debt: Number(body.debt) || 0,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json(doc.toObject());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Không tạo được khách hàng' });
  }
}

async function updateCustomer(req, res) {
  try {
    const { userId, storeFilter } = await buildStoreFilter(req);
    const doc = await resolveCustomerDoc(userId, storeFilter, req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy' });

    const allowed = [
      'name', 'phone', 'customerCode', 'address', 'area', 'ward', 'group', 'email', 'note',
      'gender', 'dateOfBirth', 'facebook', 'nickname', 'points', 'debt',
      'customerType', 'company', 'taxId', 'citizenId', 'lastTransactionAt', 'status',
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });
    patch.updatedAt = Date.now();

    const updated = await Customer.findByIdAndUpdate(doc._id, { $set: patch }, { new: true }).lean();
    res.json(updated);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Cập nhật thất bại' });
  }
}

module.exports = {
  buildStoreFilter,
  listCustomers,
  getCustomer,
  customerOrders,
  customerReturns,
  customerLedger,
  customerPointsHistory,
  createCustomer,
  updateCustomer,
};
