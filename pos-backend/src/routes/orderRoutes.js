const express = require('express');
const authRequired = require('../middlewares/auth');
const { listOrders, getOrder, deleteOrder, updateOrder, replaceOrder } = require('../controllers/orderController');

const router = express.Router();

// Không dùng storeScope cho list: controller đã lọc theo storeIds của user, tránh lỗi "Cửa hàng không hợp lệ" khi X-Store-Id không trùng store được gán
router.get('/', authRequired, listOrders);
router.get('/:id', authRequired, getOrder);
router.post('/:id/replace', authRequired, replaceOrder);
router.patch('/:id', authRequired, updateOrder);
router.delete('/:id', authRequired, deleteOrder);

module.exports = router;
