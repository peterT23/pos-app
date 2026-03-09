const User = require('../models/User');

async function storeScope(req, res, next) {
  const headerStoreId = req.headers['x-store-id'];
  const storeId = typeof headerStoreId === 'string' && headerStoreId.trim()
    ? headerStoreId.trim()
    : 'default';

  const userId = req.user?.sub;
  const role = req.user?.role;
  if (role === 'system_admin') {
    req.storeId = storeId;
    return next();
  }
  if (userId) {
    const user = await User.findById(userId).lean();
    const storeIds = Array.isArray(user?.storeIds) ? user.storeIds : [];
    if (storeIds.length > 0 && !storeIds.includes(storeId)) {
      return res.status(403).json({ message: 'Cửa hàng không hợp lệ' });
    }
    if (storeIds.length === 0) {
      return res.status(403).json({ message: 'Chưa được gán cửa hàng' });
    }
  }

  req.storeId = storeId;
  return next();
}

module.exports = storeScope;
