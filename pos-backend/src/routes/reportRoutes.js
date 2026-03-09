const express = require('express');
const authRequired = require('../middlewares/auth');
const { salesReport, recentActivity } = require('../controllers/reportController');

const router = express.Router();

router.get('/sales', authRequired, salesReport);
router.get('/activity', authRequired, recentActivity);

module.exports = router;
