const express = require('express');
const authRequired = require('../middlewares/auth');
const { listSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');

const router = express.Router();

router.get('/', authRequired, listSuppliers);
router.post('/', authRequired, createSupplier);
router.patch('/:id', authRequired, updateSupplier);
router.delete('/:id', authRequired, deleteSupplier);

module.exports = router;
