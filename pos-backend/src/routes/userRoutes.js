const express = require('express');
const authRequired = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const validateRequest = require('../middlewares/validate');
const { createUserValidator } = require('../validators/userValidators');
const { listUsers, createUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', authRequired, requireRole(['owner', 'system_admin', 'admin']), listUsers);
router.post('/', authRequired, requireRole(['owner', 'system_admin', 'admin']), createUserValidator, validateRequest, createUser);

module.exports = router;
