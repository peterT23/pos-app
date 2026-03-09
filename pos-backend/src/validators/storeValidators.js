const { body } = require('express-validator');

const createStoreValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Tên cửa hàng tối thiểu 2 ký tự'),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('storeId').optional().isString(),
  body('industry').optional().isString(),
  body('country').optional().isString(),
  body('region').optional().isString(),
];

module.exports = {
  createStoreValidator,
};
