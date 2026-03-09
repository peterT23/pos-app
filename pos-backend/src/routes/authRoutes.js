const express = require('express');
const { loginValidator, refreshValidator } = require('../validators/authValidators');
const { login, refresh, logout, switchSession } = require('../controllers/authController');
const authRequired = require('../middlewares/auth');

const router = express.Router();

router.post('/login', loginValidator, login);
router.post('/refresh', refreshValidator, refresh);
router.post('/logout', logout);
router.post('/switch', authRequired, switchSession);
router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
