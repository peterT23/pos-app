const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Store = require('../models/Store');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildStoreId(storeName) {
  const base = slugify(storeName) || 'store';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function registerTrial(req, res) {
  const {
    name,
    email,
    phone,
    password,
    storeName,
    industry,
    country,
    region,
  } = req.body || {};

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ message: 'Email đã tồn tại' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const storeId = buildStoreId(storeName);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || '',
    passwordHash,
    role: 'owner',
    storeIds: [storeId],
  });

  const store = await Store.create({
    userId: user._id.toString(),
    storeId,
    name: storeName.trim(),
    phone: phone?.trim() || '',
    address: '',
    industry: String(industry || '').trim(),
    country: String(country || '').trim(),
    region: String(region || '').trim(),
    isHeadquarters: true,
  });

  return res.status(201).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    store: {
      storeId: store.storeId,
      name: store.name,
      industry: industry || '',
      country: country || '',
      region: region || '',
    },
    loginIdentifier: user.email,
  });
}

module.exports = {
  registerTrial,
};
