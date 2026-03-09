const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Store = require('../models/Store');

async function listUsers(req, res) {
  const adminId = req.user?.sub;
  const stores = await Store.find({ userId: adminId }).lean();
  const storeIds = stores.map((store) => store.storeId);

  const users = await User.find({
    $or: [
      { _id: adminId },
      { storeIds: { $in: storeIds } },
    ],
  }).select('-passwordHash').lean();

  return res.json({ users });
}

async function createUser(req, res) {
  const adminId = req.user?.sub;
  const { name, email, password, storeIds = [] } = req.body || {};

  const normalizedEmail = email.toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ message: 'Email đã tồn tại' });
  }

  const stores = await Store.find({ userId: adminId }).lean();
  const allowedStoreIds = new Set(stores.map((store) => store.storeId));
  const safeStoreIds = Array.isArray(storeIds)
    ? storeIds.filter((storeId) => allowedStoreIds.has(storeId))
    : [];

  if (safeStoreIds.length === 0) {
    return res.status(400).json({ message: 'Cashier phải được gán cửa hàng' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'cashier',
    storeIds: safeStoreIds,
  });

  return res.status(201).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      storeIds: user.storeIds || [],
    },
  });
}

module.exports = {
  listUsers,
  createUser,
};
