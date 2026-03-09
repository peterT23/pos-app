const SupplierGroup = require('../models/SupplierGroup');

async function listSupplierGroups(req, res) {
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

  const groups = await SupplierGroup.find({
    userId: effectiveUserId,
    ...storeFilter,
  })
    .sort({ name: 1 })
    .lean();

  return res.json({ groups });
}

async function createSupplierGroup(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const { name, notes } = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập tên nhóm' });
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

  const trimmedName = String(name).trim();
  const existing = await SupplierGroup.findOne({
    userId: effectiveUserId,
    storeId: resolvedStoreId,
    name: trimmedName,
  });
  if (existing) {
    return res.status(400).json({ message: 'Tên nhóm nhà cung cấp đã tồn tại' });
  }

  const created = await SupplierGroup.create({
    userId: effectiveUserId,
    storeId: resolvedStoreId,
    name: trimmedName,
    notes: String(notes || '').trim(),
  });

  return res.status(201).json({ group: created });
}

module.exports = {
  listSupplierGroups,
  createSupplierGroup,
};
