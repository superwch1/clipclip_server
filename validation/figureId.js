const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validateFields = [
  check('figure.id')
    .custom(value => mongoose.Types.ObjectId.isValid(value.slice(7)))
    .withMessage('invalid figure id'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors.array()[0].msg);
    }
    next();
  }
];

module.exports = validateFields;