const express = require('express');
const authRequired = require('../middlewares/auth');
const storeScope = require('../middlewares/storeScope');
const validateRequest = require('../middlewares/validate');
const {
  orderValidators,
  masterValidators,
  returnValidators,
} = require('../validators/syncValidators');
const {
  pushOrders,
  pullBootstrap,
  pushMasterData,
  pushReturns,
} = require('../controllers/syncController');

const router = express.Router();

router.post('/orders', authRequired, storeScope, orderValidators, validateRequest, pushOrders);
router.get('/bootstrap', authRequired, storeScope, pullBootstrap);
router.post('/master', authRequired, storeScope, masterValidators, validateRequest, pushMasterData);
router.post('/returns', authRequired, storeScope, returnValidators, validateRequest, pushReturns);

module.exports = router;
