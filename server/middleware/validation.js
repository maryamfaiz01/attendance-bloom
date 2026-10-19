const { body, validationResult } = require('express-validator');

// Helper middleware to check validation results
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => err.msg);
    return res.status(400).json({ error: errorList.join(', '), details: errors.array() });
  }
  next();
}

const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isAlphanumeric().withMessage('Username must be alphanumeric')
    .escape(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password and confirmation password do not match');
      }
      return true;
    }),
  handleValidationErrors
];

const studentValidation = [
  body('id')
    .trim()
    .notEmpty().withMessage('Student ID is required')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('Student ID must contain only letters, numbers, hyphens, or underscores'),
  body('name')
    .trim()
    .notEmpty().withMessage('Student name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('department')
    .trim()
    .notEmpty().withMessage('Department is required')
    .isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  handleValidationErrors
];

const attendanceValidation = [
  body('studentId')
    .trim()
    .notEmpty().withMessage('Student ID is required')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('Student ID format is invalid'),
  body('type')
    .trim()
    .isIn(['check_in', 'check_out']).withMessage('Attendance type must be check_in or check_out'),
  handleValidationErrors
];

const studentUpdateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Student name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('department')
    .trim()
    .notEmpty().withMessage('Department is required')
    .isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  handleValidationErrors
];

module.exports = {
  loginValidation,
  changePasswordValidation,
  studentValidation,
  studentUpdateValidation,
  attendanceValidation
};
