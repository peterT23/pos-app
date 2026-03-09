const express = require('express');
const authRequired = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const validateRequest = require('../middlewares/validate');
const { createStoreValidator } = require('../validators/storeValidators');
const { listStores, listMyStores, createStore } = require('../controllers/storeController');

const router = express.Router();

router.get('/me', authRequired, listMyStores);
router.get('/', authRequired, requireRole(['system_admin', 'admin']), listStores);
router.post('/', authRequired, requireRole(['owner', 'system_admin', 'admin']), createStoreValidator, validateRequest, createStore);

module.exports = router;
