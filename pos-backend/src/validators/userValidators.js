const { body } = require('express-validator');

const createUserValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Tên tối thiểu 2 ký tự'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage('Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt'),
  body('role').optional().isIn(['cashier']).withMessage('Role không hợp lệ'),
  body('storeIds').optional().isArray(),
];

module.exports = {
  createUserValidator,
};
