const express = require('express');
const authRequired = require('../middlewares/auth');
const { listBrands, createBrand } = require('../controllers/brandController');

const router = express.Router();

router.get('/', authRequired, listBrands);
router.post('/', authRequired, createBrand);

module.exports = router;
