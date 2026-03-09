const express = require('express');
const authRequired = require('../middlewares/auth');
const {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} = require('../controllers/purchaseOrderController');

const router = express.Router();

router.get('/', authRequired, listPurchaseOrders);
router.get('/:id', authRequired, getPurchaseOrder);
router.post('/', authRequired, createPurchaseOrder);
router.patch('/:id', authRequired, updatePurchaseOrder);
router.delete('/:id', authRequired, deletePurchaseOrder);

module.exports = router;
