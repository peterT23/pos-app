const express = require('express');
const authRequired = require('../middlewares/auth');
const { getReturn } = require('../controllers/returnController');

const router = express.Router();

router.get('/:id', authRequired, getReturn);

module.exports = router;
