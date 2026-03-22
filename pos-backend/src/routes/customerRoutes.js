const express = require('express');
const authRequired = require('../middlewares/auth');
const {
  listCustomers,
  getCustomer,
  customerOrders,
  customerReturns,
  customerLedger,
  customerPointsHistory,
  createCustomer,
  updateCustomer,
} = require('../controllers/customerController');
const {
  upload,
  downloadCustomerTemplate,
  importCustomers,
} = require('../controllers/customerImportController');

const router = express.Router();

router.get('/import/template', authRequired, downloadCustomerTemplate);
router.post('/import', authRequired, upload.single('file'), importCustomers);

router.get('/', authRequired, listCustomers);
router.post('/', authRequired, createCustomer);
router.get('/:id/orders', authRequired, customerOrders);
router.get('/:id/returns', authRequired, customerReturns);
router.get('/:id/ledger', authRequired, customerLedger);
router.get('/:id/points-history', authRequired, customerPointsHistory);
router.get('/:id', authRequired, getCustomer);
router.patch('/:id', authRequired, updateCustomer);

module.exports = router;
