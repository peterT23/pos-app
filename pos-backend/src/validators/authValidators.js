const { body } = require('express-validator');

const loginValidator = [
  body('identifier')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Email hoặc số điện thoại không hợp lệ'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email không hợp lệ'),
  body('password').isString().isLength({ min: 6 }).withMessage('Mật khẩu tối thiểu 6 ký tự'),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.identifier) {
      throw new Error('Thiếu email hoặc số điện thoại');
    }
    return true;
  }),
];

const registerValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Tên tối thiểu 2 ký tự'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage('Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Mật khẩu xác nhận không khớp'),
];

const refreshValidator = [
  body('refreshToken').optional().isString().notEmpty().withMessage('refreshToken không hợp lệ'),
];

module.exports = {
  loginValidator,
  registerValidator,
  refreshValidator,
};
