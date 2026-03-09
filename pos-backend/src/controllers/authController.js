const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function getClientApp(req) {
  const raw = String(
    req.headers['x-client-app'] || req.query?.clientApp || req.body?.clientApp || ''
  ).toLowerCase();
  if (raw === 'pos-admin') return 'pos-admin';
  return 'pos-app';
}

function getRefreshCookieName(clientApp) {
  return clientApp === 'pos-admin' ? 'refreshTokenAdmin' : 'refreshTokenPos';
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
  }

  const { email, identifier, password } = req.body;
  const rawIdentifier = String(identifier || email || '').trim();
  const normalizedEmail = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : '';
  const query = normalizedEmail
    ? { email: normalizedEmail }
    : { phone: rawIdentifier };
  const user = await User.findOne(query);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Sai thông tin đăng nhập' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Sai thông tin đăng nhập' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokenPayload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    storeIds: user.storeIds || [],
  };
  const token = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  const clientApp = getClientApp(req);
  const cookieName = getRefreshCookieName(clientApp);
  res.cookie(cookieName, refreshToken, cookieOptions);
  return res.json({
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      storeIds: user.storeIds || [],
    },
  });
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
  }

  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ message: 'Email đã tồn tại' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'cashier',
  });

  const tokenPayload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    storeIds: user.storeIds || [],
  };
  const token = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  const clientApp = getClientApp(req);
  const cookieName = getRefreshCookieName(clientApp);
  res.cookie(cookieName, refreshToken, cookieOptions);
  return res.status(201).json({
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      storeIds: user.storeIds || [],
    },
  });
}

async function refresh(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
  }

  const clientApp = getClientApp(req);
  const cookieName = getRefreshCookieName(clientApp);
  const refreshToken = req.body?.refreshToken || req.cookies?.[cookieName];
  if (!refreshToken) {
    return res.status(204).end();
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Tài khoản không hợp lệ' });
    }
    const tokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      storeIds: user.storeIds || [],
    };
    const token = signAccessToken(tokenPayload);
    res.cookie(cookieName, refreshToken, cookieOptions);
    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        storeIds: user.storeIds || [],
      },
    });
  } catch (err) {
    res.clearCookie(cookieName, cookieOptions);
    return res.status(204).end();
  }
}

async function logout(req, res) {
  const clientApp = getClientApp(req);
  const cookieName = getRefreshCookieName(clientApp);
  res.clearCookie(cookieName, cookieOptions);
  return res.json({ message: 'Đã đăng xuất' });
}

async function switchSession(req, res) {
  const targetRaw = String(req.body?.targetApp || '').toLowerCase();
  const targetApp = targetRaw === 'pos-admin' ? 'pos-admin' : 'pos-app';
  const tokenPayload = {
    sub: req.user?.sub,
    email: req.user?.email,
    name: req.user?.name,
    role: req.user?.role,
    storeIds: req.user?.storeIds || [],
  };
  const refreshToken = signRefreshToken(tokenPayload);
  const cookieName = getRefreshCookieName(targetApp);
  res.cookie(cookieName, refreshToken, cookieOptions);
  return res.json({ message: 'Switched session', targetApp });
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  switchSession,
};
