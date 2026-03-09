const Category = require('../models/Category');

async function listCategories(req, res) {
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

  const categories = await Category.find({
    userId: effectiveUserId,
    ...storeFilter,
  })
    .sort({ level: 1, name: 1 })
    .lean();

  return res.json({ categories });
}

async function createCategory(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const { name, parentId } = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập tên nhóm hàng' });
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

  let level = 1;
  if (parentId) {
    const parent = await Category.findOne({
      userId: effectiveUserId,
      ...storeFilter,
      _id: parentId,
    }).lean();
    if (!parent) {
      return res.status(400).json({ message: 'Nhóm hàng cha không tồn tại' });
    }
    if (parent.level >= 4) {
      return res.status(400).json({ message: 'Chỉ cho phép tối đa 4 cấp nhóm hàng' });
    }
    level = parent.level + 1;
  }

  const created = await Category.create({
    userId: effectiveUserId,
    storeId: resolvedStoreId,
    name: String(name).trim(),
    parentId: parentId || '',
    level,
  });

  return res.status(201).json({ category: created });
}

module.exports = {
  listCategories,
  createCategory,
};
