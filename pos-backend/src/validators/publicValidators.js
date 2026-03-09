const { body } = require('express-validator');

const registerTrialValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Tên tối thiểu 2 ký tự'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('phone').optional().isString().trim().isLength({ min: 6 }).withMessage('Số điện thoại không hợp lệ'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Mật khẩu tối thiểu 6 ký tự'),
    // TODO: Bật lại validation phức tạp khi lên production
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    // .withMessage('Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt'),
  body('storeName').isString().trim().isLength({ min: 2 }).withMessage('Tên cửa hàng tối thiểu 2 ký tự'),
  body('industry').optional().isString(),
  body('country').optional().isString(),
  body('region').optional().isString(),
];

module.exports = {
  registerTrialValidator,
};
