const Product = require('../models/Product');

async function getNextProductCode(userId, storeId) {
  const codeRegex = /^SP\d{6}$/;
  const items = await Product.find({ userId, productCode: codeRegex })
    .select('productCode')
    .lean();
  const maxNumber = items.reduce((max, item) => {
    const value = Number(String(item.productCode).slice(2));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const next = maxNumber + 1;
  return `SP${String(next).padStart(6, '0')}`;
}

async function listProducts(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let storeFilter = {};
  if (storeId) {
    storeFilter = { storeId };
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }

  const matchStage = {
    userId: effectiveUserId,
    deleted: { $ne: true },
    ...storeFilter,
  };
  const products = await Product.aggregate([
    { $match: matchStage },
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: { userId: '$userId', productCode: { $ifNull: ['$productCode', ''] } },
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { updatedAt: -1 } },
  ]);

  return res.json({ products });
}

async function upsertProducts(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const { products } = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ' });
  }

  let storeFilter = {};
  let resolvedStoreId = '';
  if (storeId) {
    storeFilter = { storeId };
    resolvedStoreId = storeId;
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
    resolvedStoreId = req.user.storeIds[0];
  } else {
    return res.status(400).json({ message: 'Thiếu thông tin cửa hàng' });
  }

  const now = Date.now();
  let nextCode = await getNextProductCode(effectiveUserId, resolvedStoreId);
  const nextNumber = () => {
    const code = nextCode;
    const current = Number(code.slice(2));
    nextCode = `SP${String(current + 1).padStart(6, '0')}`;
    return code;
  };

  for (const item of products) {
    const categoryId = String(item.categoryId || '').trim();
    if (!categoryId) {
      return res.status(400).json({ message: 'Nhóm hàng là bắt buộc. Vui lòng chọn nhóm hàng cho sản phẩm.' });
    }
  }

  const existingByCode = await Product.find(
    { userId: effectiveUserId, productCode: { $in: products.map((p) => String(p.productCode || '').trim()).filter(Boolean) } },
    { productCode: 1, _id: 1, localId: 1 }
  ).lean();
  const existingMap = new Map(existingByCode.map((d) => [String(d.productCode || '').trim(), d]));

  const resolvedProducts = products.map((item) => {
    let productCode = String(item.productCode || '').trim();
    if (!productCode) {
      return { ...item, productCode: nextNumber() };
    }
    const existing = existingMap.get(productCode);
    if (existing) {
      const sameProduct =
        (item._id && String(item._id) === String(existing._id)) ||
        (item.localId && String(item.localId) === String(existing.localId));
      if (!sameProduct) {
        productCode = nextNumber();
      }
    }
    return { ...item, productCode };
  });

  const ops = resolvedProducts.map((item) => {
    const productCode = item.productCode;
    return {
      updateOne: {
        filter: { userId: effectiveUserId, productCode },
        update: {
          $set: {
            userId: effectiveUserId,
            storeId: resolvedStoreId,
            localId: item.localId || `${productCode}-${now}`,
            productCode,
            barcode: item.barcode || '',
            name: item.name || '',
            price: Number(item.price) || 0,
            costPrice: Number(item.costPrice) || 0,
            stock: Number(item.stock) || 0,
            unit: item.unit || '',
            categoryId: item.categoryId || '',
            brandId: item.brandId || '',
            allowPoints: item.allowPoints !== false,
            parentId: item.parentId || '',
            attributeName: item.attributeName || '',
            attributeValue: item.attributeValue || '',
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  await Product.bulkWrite(ops);
  return res.status(201).json({ message: 'Đã lưu sản phẩm' });
}

/** Returns the next N sequential product codes (SP000001, SP000002, ...). */
async function getNextProductCodes(userId, storeId, count) {
  if (!count || count < 1) return [];
  const codeRegex = /^SP\d{6}$/;
  const items = await Product.find({ userId, storeId, productCode: codeRegex })
    .select('productCode')
    .lean();
  const maxNumber = items.reduce((max, item) => {
    const value = Number(String(item.productCode).slice(2));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const codes = [];
  for (let i = 1; i <= count; i++) {
    codes.push(`SP${String(maxNumber + i).padStart(6, '0')}`);
  }
  return codes;
}

async function nextProductCode(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let resolvedStoreId = '';
  if (storeId) {
    resolvedStoreId = storeId;
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    resolvedStoreId = req.user.storeIds[0];
  } else {
    return res.status(400).json({ message: 'Thiếu thông tin cửa hàng' });
  }

  const code = await getNextProductCode(effectiveUserId, resolvedStoreId);
  return res.json({ code });
}

async function nextProductCodes(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId, count } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let resolvedStoreId = '';
  if (storeId) {
    resolvedStoreId = storeId;
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    resolvedStoreId = req.user.storeIds[0];
  } else {
    return res.status(400).json({ message: 'Thiếu thông tin cửa hàng' });
  }

  const n = Math.min(Math.max(1, parseInt(count, 10) || 1), 100);
  const codes = await getNextProductCodes(effectiveUserId, resolvedStoreId, n);
  return res.json({ codes });
}

async function checkProductCode(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const { code } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  const productCode = String(code || '').trim();
  if (!productCode) {
    return res.status(400).json({ message: 'Thiếu mã hàng' });
  }

  let storeFilter = {};
  if (storeId) {
    storeFilter = { storeId };
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    storeFilter = { storeId: { $in: req.user.storeIds } };
  }

  const exists = await Product.exists({
    userId: effectiveUserId,
    productCode,
    deleted: { $ne: true },
    ...storeFilter,
  });

  return res.json({ exists: Boolean(exists) });
}

/** Soft delete: đánh dấu deleted = true theo _id (MongoDB). */
async function deleteProduct(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!id) {
    return res.status(400).json({ message: 'Thiếu id sản phẩm' });
  }

  const updated = await Product.findOneAndUpdate(
    { _id: id, userId: effectiveUserId },
    { $set: { deleted: true, updatedAt: Date.now() } },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ message: 'Không tìm thấy hàng hóa' });
  }
  return res.json({ message: 'Đã xóa hàng hóa' });
}

module.exports = {
  listProducts,
  upsertProducts,
  checkProductCode,
  nextProductCode,
  nextProductCodes,
  deleteProduct,
};
