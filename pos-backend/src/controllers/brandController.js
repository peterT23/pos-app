const Brand = require('../models/Brand');

async function listBrands(req, res) {
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

  const brands = await Brand.find({
    userId: effectiveUserId,
    ...storeFilter,
  })
    .sort({ name: 1 })
    .lean();

  return res.json({ brands });
}

async function createBrand(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const { name } = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập tên thương hiệu' });
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

  const created = await Brand.create({
    userId: effectiveUserId,
    storeId: resolvedStoreId,
    name: String(name).trim(),
  });

  return res.status(201).json({ brand: created });
}

module.exports = {
  listBrands,
  createBrand,
};
