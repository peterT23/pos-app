const express = require('express');
const authRequired = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { listProducts, upsertProducts, checkProductCode, nextProductCode, nextProductCodes, deleteProduct } = require('../controllers/productController');
const { importProducts, downloadTemplate } = require('../controllers/productImportController');

const router = express.Router();

router.get('/', authRequired, listProducts);
router.get('/import-template', authRequired, downloadTemplate);
router.get('/next-code', authRequired, nextProductCode);
router.get('/next-codes', authRequired, nextProductCodes);
router.get('/check-code', authRequired, checkProductCode);
router.post('/', authRequired, upsertProducts);
router.delete('/:id', authRequired, deleteProduct);
router.post('/import', authRequired, upload.single('file'), importProducts);

module.exports = router;
