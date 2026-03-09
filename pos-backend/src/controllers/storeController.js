const Store = require('../models/Store');
const User = require('../models/User');

function generateStoreId() {
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `store_${Date.now()}_${suffix}`;
}

async function listStores(req, res) {
  const userId = req.user?.sub;
  const stores = await Store.find({ userId }).lean();
  return res.json({ stores });
}

async function listMyStores(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;

  if (role === 'system_admin') {
    const stores = await Store.find({}).lean();
    return res.json({ stores });
  }
  if (role === 'admin' || role === 'owner') {
    const stores = await Store.find({ userId }).lean();
    return res.json({ stores });
  }

  const user = await User.findById(userId).lean();
  const storeIds = Array.isArray(user?.storeIds) ? user.storeIds : [];
  if (storeIds.length === 0) {
    return res.json({ stores: [] });
  }
  const stores = await Store.find({ storeId: { $in: storeIds } }).lean();
  return res.json({ stores });
}

async function createStore(req, res) {
  const userId = req.user?.sub;
  const {
    name,
    phone = '',
    address = '',
    storeId,
    industry = '',
    country = '',
    region = '',
  } = req.body || {};

  const finalStoreId = storeId && storeId.trim() ? storeId.trim() : generateStoreId();

  const exists = await Store.findOne({ userId, storeId: finalStoreId });
  if (exists) {
    return res.status(409).json({ message: 'Mã cửa hàng đã tồn tại' });
  }

  const store = await Store.create({
    userId,
    storeId: finalStoreId,
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    industry: String(industry || '').trim(),
    country: String(country || '').trim(),
    region: String(region || '').trim(),
    isHeadquarters: false,
  });

  await User.updateOne(
    { _id: userId },
    { $addToSet: { storeIds: finalStoreId } }
  );

  return res.status(201).json({ store });
}

module.exports = {
  listStores,
  listMyStores,
  createStore,
};
