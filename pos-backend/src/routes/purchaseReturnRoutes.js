const express = require('express');
const authRequired = require('../middlewares/auth');
const { createPurchaseReturn } = require('../controllers/purchaseReturnController');

const router = express.Router();

router.post('/', authRequired, createPurchaseReturn);

module.exports = router;
