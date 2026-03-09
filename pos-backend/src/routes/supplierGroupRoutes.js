const express = require('express');
const authRequired = require('../middlewares/auth');
const { listSupplierGroups, createSupplierGroup } = require('../controllers/supplierGroupController');

const router = express.Router();

router.get('/', authRequired, listSupplierGroups);
router.post('/', authRequired, createSupplierGroup);

module.exports = router;
