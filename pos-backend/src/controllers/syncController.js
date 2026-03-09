const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Setting = require('../models/Setting');
const Return = require('../models/Return');
const ReturnItem = require('../models/ReturnItem');

async function pullBootstrap(req, res) {
  const userId = req.user?.sub;
  const storeId = req.storeId || 'default';
  const scope = {
    $or: [
      { userId, storeId },
      { userId, storeId: { $exists: false } },
      { userId: { $exists: false }, storeId: { $exists: false } },
    ],
  };
  // Khách hàng: chỉ theo userId — 1 user nhiều chi nhánh dùng chung danh sách khách
  const customerScope = { userId };
  const [products, customers, settings] = await Promise.all([
    Product.find(scope).lean(),
    Customer.find(customerScope).lean(),
    Setting.find(scope).lean(),
  ]);

  return res.json({
    products,
    customers,
    settings,
  });
}

async function pushOrders(req, res) {
  const userId = req.user?.sub;
  const storeId = req.storeId || 'default';
  const { orders = [], orderItems = [] } = req.body || {};

  if (!Array.isArray(orders) || !Array.isArray(orderItems)) {
    return res.status(400).json({ message: 'Dữ liệu sync không hợp lệ' });
  }

  if (orders.length === 0) {
    return res.json({ message: 'Không có dữ liệu mới', syncedOrders: 0, syncedItems: 0 });
  }

  const orderOps = orders.map((order) => ({
    updateOne: {
      filter: {
        localId: order.localId,
        $or: [
          { userId, storeId },
          { userId, storeId: { $exists: false } },
          { userId: { $exists: false }, storeId: { $exists: false } },
        ],
      },
      update: {
        $set: {
          userId,
          storeId,
          localId: order.localId,
          orderCode: order.orderCode,
          totalAmount: order.totalAmount,
          subtotalAmount: order.subtotalAmount,
          discount: order.discount,
          discountType: order.discountType,
          paymentMethod: order.paymentMethod,
          cashierId: order.cashierId || '',
          cashierName: order.cashierName || '',
          customerLocalId: order.customerLocalId || null,
          customerPhone: order.customerPhone || null,
          pointsUsed: order.pointsUsed || 0,
          pointsEarned: order.pointsEarned || 0,
          status: order.status || 'completed',
          createdAt: order.createdAt,
          note: order.note || '',
        },
      },
      upsert: true,
    },
  }));

  const itemOps = orderItems
    .filter((item) => item && item.localId)
    .map((item) => ({
      updateOne: {
        filter: {
          localId: item.localId,
          $or: [
            { userId, storeId },
            { userId, storeId: { $exists: false } },
            { userId: { $exists: false }, storeId: { $exists: false } },
          ],
        },
        update: {
          $set: {
            userId,
            storeId,
            localId: item.localId,
            orderLocalId: item.orderLocalId,
            productLocalId: item.productLocalId,
            productName: item.productName || '',
            price: item.price || 0,
            qty: item.qty || 0,
            subtotal: item.subtotal || 0,
          },
        },
        upsert: true,
      },
    }));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Order.bulkWrite(orderOps, { ordered: false, session });
      if (itemOps.length > 0) {
        await OrderItem.bulkWrite(itemOps, { ordered: false, session });
      }
    });
  } finally {
    session.endSession();
  }

  return res.json({
    message: 'Đồng bộ thành công',
    syncedOrders: orders.length,
    syncedItems: itemOps.length,
  });
}

async function pushMasterData(req, res) {
  const userId = req.user?.sub;
  const storeId = req.storeId || 'default';
  const { products = [], customers = [] } = req.body || {};

  if (!Array.isArray(products) || !Array.isArray(customers)) {
    return res.status(400).json({ message: 'Dữ liệu sync không hợp lệ' });
  }

  const productCodeRegex = /^SP\d{6}$/;
  const existingProductCodes = await Product.find({ userId, storeId, productCode: productCodeRegex })
    .select('productCode')
    .lean();
  let maxProductNumber = existingProductCodes.reduce((max, item) => {
    const value = Number(String(item.productCode).slice(2));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const customerCodeRegex = /^KH\d{6}$/;
  const existingCustomerCodes = await Customer.find({ userId, customerCode: customerCodeRegex })
    .select('customerCode')
    .lean();
  let maxCustomerNumber = existingCustomerCodes.reduce((max, item) => {
    const value = Number(String(item.customerCode).slice(2));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const productOps = products.map((product) => {
    let productCode = product.productCode || '';
    if (!productCode) {
      maxProductNumber += 1;
      productCode = `SP${String(maxProductNumber).padStart(6, '0')}`;
    }
    return ({
    updateOne: {
      filter: {
        localId: product.localId,
        $or: [
          { userId, storeId },
          { userId, storeId: { $exists: false } },
          { userId: { $exists: false }, storeId: { $exists: false } },
        ],
      },
      update: {
        $set: {
          userId,
          storeId,
          localId: product.localId,
          productCode,
          barcode: product.barcode || '',
          name: product.name || '',
          price: product.price || 0,
          costPrice: product.costPrice || 0,
          stock: product.stock || 0,
          unit: product.unit || '',
          categoryId: product.categoryId || '',
          brandId: product.brandId || '',
          allowPoints: product.allowPoints !== false,
          deleted: Boolean(product.deleted),
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      },
      upsert: true,
    },
    }
  );
  });

  // Khách hàng: upsert theo userId + localId (không phân store), storeId = 'default' để dùng chung mọi chi nhánh
  const customerStoreId = 'default';
  const customerOps = customers.map((customer) => {
    let customerCode = customer.customerCode || '';
    if (!customerCode) {
      maxCustomerNumber += 1;
      customerCode = `KH${String(maxCustomerNumber).padStart(6, '0')}`;
    }
    return ({
    updateOne: {
      filter: {
        userId,
        localId: customer.localId,
      },
      update: {
        $set: {
          userId,
          storeId: customerStoreId,
          localId: customer.localId,
          customerCode,
          name: customer.name || '',
          nickname: customer.nickname || '',
          phone: customer.phone || '',
          address: customer.address || '',
          area: customer.area || '',
          ward: customer.ward || '',
          group: customer.group || '',
          dateOfBirth: customer.dateOfBirth || '',
          gender: customer.gender || '',
          email: customer.email || '',
          facebook: customer.facebook || '',
          note: customer.note || '',
          points: customer.points || 0,
          debt: customer.debt || 0,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
      upsert: true,
    },
    }
  );
  });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (productOps.length > 0) {
        await Product.bulkWrite(productOps, { ordered: false, session });
      }
      if (customerOps.length > 0) {
        await Customer.bulkWrite(customerOps, { ordered: false, session });
      }
    });
  } finally {
    session.endSession();
  }

  return res.json({
    message: 'Đồng bộ danh mục thành công',
    syncedProducts: productOps.length,
    syncedCustomers: customerOps.length,
  });
}

async function pushReturns(req, res) {
  const userId = req.user?.sub;
  const storeId = req.storeId || 'default';
  const { returns = [], returnItems = [] } = req.body || {};

  if (!Array.isArray(returns) || !Array.isArray(returnItems)) {
    return res.status(400).json({ message: 'Dữ liệu sync không hợp lệ' });
  }

  if (returns.length === 0) {
    return res.json({ message: 'Không có dữ liệu mới', syncedReturns: 0, syncedItems: 0 });
  }

  const returnOps = returns.map((record) => ({
    updateOne: {
      filter: {
        localId: record.localId,
        $or: [
          { userId, storeId },
          { userId, storeId: { $exists: false } },
          { userId: { $exists: false }, storeId: { $exists: false } },
        ],
      },
      update: {
        $set: {
          userId,
          storeId,
          localId: record.localId,
          returnCode: record.returnCode || '',
          orderLocalId: record.orderLocalId || '',
          orderCode: record.orderCode || '',
          exchangeOrderLocalId: record.exchangeOrderLocalId || '',
          exchangeOrderCode: record.exchangeOrderCode || '',
          cashierId: record.cashierId || '',
          cashierName: record.cashierName || '',
          customerLocalId: record.customerLocalId || '',
          customerPhone: record.customerPhone || '',
          totalReturnAmount: record.totalReturnAmount || 0,
          totalExchangeAmount: record.totalExchangeAmount || 0,
          netAmount: record.netAmount || 0,
          paymentMethod: record.paymentMethod || '',
          amountPaid: record.amountPaid || 0,
          createdAt: record.createdAt,
          exchangeItems: Array.isArray(record.exchangeItems) ? record.exchangeItems : [],
        },
      },
      upsert: true,
    },
  }));

  const returnItemOps = returnItems
    .filter((item) => item && item.localId)
    .map((item) => ({
      updateOne: {
        filter: {
          localId: item.localId,
          $or: [
            { userId, storeId },
            { userId, storeId: { $exists: false } },
            { userId: { $exists: false }, storeId: { $exists: false } },
          ],
        },
        update: {
          $set: {
            userId,
            storeId,
            localId: item.localId,
            returnLocalId: item.returnLocalId,
            productLocalId: item.productLocalId,
            productName: item.productName || '',
            price: item.price || 0,
            qty: item.qty || 0,
            subtotal: item.subtotal || 0,
          },
        },
        upsert: true,
      },
    }));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Return.bulkWrite(returnOps, { ordered: false, session });
      if (returnItemOps.length > 0) {
        await ReturnItem.bulkWrite(returnItemOps, { ordered: false, session });
      }
    });
  } finally {
    session.endSession();
  }

  return res.json({
    message: 'Đồng bộ trả hàng thành công',
    syncedReturns: returnOps.length,
    syncedItems: returnItemOps.length,
  });
}

module.exports = {
  pullBootstrap,
  pushOrders,
  pushMasterData,
  pushReturns,
};
