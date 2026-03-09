const express = require('express');
const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const { getClientIp } = require('../utils/ip');
const validateRequest = require('../middlewares/validate');
const { registerTrialValidator } = require('../validators/publicValidators');
const { registerTrial } = require('../controllers/publicController');

const router = express.Router();

const captchaStore = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

function setCaptcha(id, text) {
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  captchaStore.set(id, { text, expiresAt });
}

function getCaptcha(id) {
  const record = captchaStore.get(id);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    captchaStore.delete(id);
    return null;
  }
  return record;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (now > record.expiresAt) {
      captchaStore.delete(id);
    }
  }
}, 60 * 1000);

router.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: '#f2f4f8',
  });
  const captchaId = crypto.randomUUID();
  setCaptcha(captchaId, captcha.text);

  const image = `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`;
  res.json({ captchaId, image });
});

router.get('/geo', async (req, res) => {
  const ip = getClientIp(req);
  const target = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
  try {
    const response = await fetch(target);
    const data = await response.json().catch(() => ({}));
    const code = data?.country_code || data?.countryCode || null;
    return res.json({ countryCode: code });
  } catch (err) {
    return res.json({ countryCode: null });
  }
});

router.post('/register-trial', registerTrialValidator, validateRequest, registerTrial);

router.post('/captcha/verify', (req, res) => {
  const { captchaId, text } = req.body || {};
  if (!captchaId || !text) {
    return res.status(400).json({ ok: false, message: 'Thiếu thông tin captcha' });
  }
  const record = getCaptcha(captchaId);
  if (!record) {
    return res.status(400).json({ ok: false, message: 'Captcha đã hết hạn' });
  }
  const ok = record.text.toLowerCase() === String(text).trim().toLowerCase();
  if (ok) {
    captchaStore.delete(captchaId);
    return res.json({ ok: true });
  }
  return res.status(400).json({ ok: false, message: 'Mã xác thực không đúng' });
});

module.exports = router;
