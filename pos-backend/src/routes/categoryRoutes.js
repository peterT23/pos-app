const express = require('express');
const authRequired = require('../middlewares/auth');
const { listCategories, createCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', authRequired, listCategories);
router.post('/', authRequired, createCategory);

module.exports = router;
