const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Return = require('../models/Return');
const Store = require('../models/Store');

function buildReportRange(type, date, month, quarter, year, lunarYear) {
  if (type === 'day') {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (type === 'month') {
    const [y, m] = String(month || '').split('-').map(Number);
    const start = new Date(y, (m || 1) - 1, 1);
    const end = new Date(y, (m || 1), 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (type === 'quarter') {
    const q = Number(quarter) || 1;
    const y = Number(year);
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (type === 'year') {
    const y = Number(year);
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  const y = Number(lunarYear || year);
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function buildReportBuckets(type, rangeStart, quarter, year) {
  if (type === 'day') {
    return [
      {
        label: 'Ngày',
        start: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0),
        end: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 23, 59, 59, 999),
      },
    ];
  }
  if (type === 'month') {
    const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      return {
        label: `${day}`,
        start: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), day, 0, 0, 0, 0),
        end: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), day, 23, 59, 59, 999),
      };
    });
  }
  if (type === 'quarter') {
    const q = Number(quarter) || 1;
    const startMonth = (q - 1) * 3;
    return Array.from({ length: 3 }, (_, idx) => {
      const month = startMonth + idx;
      const start = new Date(Number(year), month, 1);
      const end = new Date(Number(year), month + 1, 0, 23, 59, 59, 999);
      return {
        label: `T${month + 1}`,
        start,
        end,
      };
    });
  }
  return Array.from({ length: 12 }, (_, idx) => {
    const start = new Date(rangeStart.getFullYear(), idx, 1);
    const end = new Date(rangeStart.getFullYear(), idx + 1, 0, 23, 59, 59, 999);
    return {
      label: `T${idx + 1}`,
      start,
      end,
    };
  });
}

async function salesReport(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const {
    type = 'day',
    date,
    month,
    quarter,
    year,
    lunarYear,
    storeId,
    userId: queryUserId,
    cashierId,
    storeScope = 'all',
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
    let headquartersIds = stores.filter((store) => store.isHeadquarters).map((store) => store.storeId);
    if (headquartersIds.length === 0 && stores.length > 0) {
      headquartersIds = [stores[0].storeId];
    }
    const branchIds = stores
      .map((store) => store.storeId)
      .filter((storeItemId) => !headquartersIds.includes(storeItemId));
    const targetIds = storeScope === 'hq' ? headquartersIds : branchIds;
    storeFilter = targetIds.length > 0 ? { storeId: { $in: targetIds } } : { storeId: '__none__' };
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }

  const { start, end } = buildReportRange(type, date, month, quarter, year, lunarYear);
  const cashierFilter = cashierId ? { cashierId } : {};
  const buckets = buildReportBuckets(type, start, quarter, year).map((bucket) => ({
    ...bucket,
    totalCost: 0,
    totalSales: 0,
    totalProfit: 0,
    totalReturns: 0,
    returnCount: 0,
    orderCount: 0,
  }));

  const orders = await Order.find({
    userId: effectiveUserId,
    status: 'completed',
    createdAt: { $gte: start.getTime(), $lte: end.getTime() },
    ...storeFilter,
    ...cashierFilter,
  }).lean();

  const returns = await Return.find({
    userId: effectiveUserId,
    createdAt: { $gte: start.getTime(), $lte: end.getTime() },
    ...storeFilter,
    ...cashierFilter,
  }).lean();

  let orderItems = [];
  let products = [];
  if (orders.length > 0) {
    const orderLocalIds = orders.map((order) => order.localId);
    orderItems = await OrderItem.find({
      userId: effectiveUserId,
      orderLocalId: { $in: orderLocalIds },
      ...storeFilter,
    }).lean();

    const productLocalIds = Array.from(new Set(orderItems.map((item) => item.productLocalId)));
    if (productLocalIds.length > 0) {
      products = await Product.find({
        userId: effectiveUserId,
        localId: { $in: productLocalIds },
        ...storeFilter,
      }).lean();
    }
  }

  const productCostMap = new Map(
    products.map((product) => [product.localId, Number(product.costPrice) || 0])
  );
  const itemsByOrder = new Map();
  orderItems.forEach((item) => {
    if (!itemsByOrder.has(item.orderLocalId)) {
      itemsByOrder.set(item.orderLocalId, []);
    }
    itemsByOrder.get(item.orderLocalId).push(item);
  });

  let totalSales = 0;
  let totalCost = 0;
  let orderCount = 0;
  let totalReturns = 0;
  let returnCount = 0;
  const quarterStartMonth = (Number(quarter) - 1) * 3;

  orders.forEach((order) => {
    const createdAt = Number(order.createdAt) || 0;
    orderCount += 1;
    totalSales += Number(order.totalAmount) || 0;

    const items = itemsByOrder.get(order.localId) || [];
    let orderCost = 0;
    items.forEach((item) => {
      const costPrice = productCostMap.get(item.productLocalId) || 0;
      orderCost += costPrice * (Number(item.qty) || 0);
    });
    totalCost += orderCost;

    const createdDate = new Date(createdAt);
    let bucketIndex = -1;
    if (type === 'day') {
      bucketIndex = 0;
    } else if (type === 'month') {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const dayIndex = Math.min(createdDate.getDate(), daysInMonth) - 1;
      bucketIndex = dayIndex;
    } else if (type === 'quarter') {
      const monthIndex = createdDate.getMonth();
      bucketIndex = monthIndex - quarterStartMonth;
    } else {
      bucketIndex = createdDate.getMonth();
    }

    if (bucketIndex >= 0 && buckets[bucketIndex]) {
      buckets[bucketIndex].totalSales += Number(order.totalAmount) || 0;
      buckets[bucketIndex].totalCost += orderCost;
      buckets[bucketIndex].totalProfit =
        buckets[bucketIndex].totalSales - buckets[bucketIndex].totalCost;
      buckets[bucketIndex].orderCount += 1;
    }
  });

  returns.forEach((record) => {
    const createdAt = Number(record.createdAt) || 0;
    const returnValue = Number(record.totalReturnAmount) || 0;
    totalReturns += returnValue;
    returnCount += 1;

    const createdDate = new Date(createdAt);
    let bucketIndex = -1;
    if (type === 'day') {
      bucketIndex = 0;
    } else if (type === 'month') {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const dayIndex = Math.min(createdDate.getDate(), daysInMonth) - 1;
      bucketIndex = dayIndex;
    } else if (type === 'quarter') {
      const monthIndex = createdDate.getMonth();
      bucketIndex = monthIndex - quarterStartMonth;
    } else {
      bucketIndex = createdDate.getMonth();
    }

    if (bucketIndex >= 0 && buckets[bucketIndex]) {
      buckets[bucketIndex].totalReturns += returnValue;
      buckets[bucketIndex].returnCount += 1;
    }
  });

  return res.json({
    totalCost,
    totalSales,
    totalReturns,
    returnCount,
    netSales: totalSales - totalReturns,
    totalProfit: totalSales - totalCost,
    orderCount,
    buckets,
  });
}

async function recentActivity(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId, storeScope = 'all', limit = 10 } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let storeFilter = {};
  if (storeId) {
    storeFilter = { storeId };
  } else if (storeScope && storeScope !== 'all') {
    const stores = await Store.find({ userId: effectiveUserId }).sort({ createdAt: 1 }).lean();
    let headquartersIds = stores.filter((store) => store.isHeadquarters).map((store) => store.storeId);
    if (headquartersIds.length === 0 && stores.length > 0) {
      headquartersIds = [stores[0].storeId];
    }
    const branchIds = stores
      .map((store) => store.storeId)
      .filter((storeItemId) => !headquartersIds.includes(storeItemId));
    const targetIds = storeScope === 'hq' ? headquartersIds : branchIds;
    storeFilter = targetIds.length > 0 ? { storeId: { $in: targetIds } } : { storeId: '__none__' };
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }

  const take = Math.min(Number(limit) || 10, 50);
  const [orders, returns] = await Promise.all([
    Order.find({
      userId: effectiveUserId,
      status: 'completed',
      ...storeFilter,
    })
      .sort({ createdAt: -1 })
      .limit(take)
      .lean(),
    Return.find({
      userId: effectiveUserId,
      ...storeFilter,
    })
      .sort({ createdAt: -1 })
      .limit(take)
      .lean(),
  ]);

  const items = [
    ...orders.map((order) => ({
      type: 'order',
      localId: order.localId,
      code: order.orderCode || '',
      amount: Number(order.totalAmount) || 0,
      createdAt: Number(order.createdAt) || 0,
      actorName: order.cashierName || req.user?.name || 'Nhân viên',
    })),
    ...returns.map((record) => ({
      type: 'return',
      localId: record.localId,
      code: record.returnCode || '',
      amount: Number(record.totalReturnAmount) || 0,
      createdAt: Number(record.createdAt) || 0,
      actorName: record.cashierName || req.user?.name || 'Nhân viên',
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, take);

  return res.json({ items });
}

module.exports = {
  salesReport,
  recentActivity,
};
