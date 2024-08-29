const { check, validationResult } = require('express-validator');

const validateFields = [
  // rgba(0,0,0,1) to rbga(255,255,255,0);
  // \d{1,2}?\d matches numbers from 0 to 99,  1\d{2} matches numbers from 100 to 199, 
  // 2[0-4]\d matches numbers from 200 to 249,  25[0-5] matches numbers from 250 to 255.
  // (0?\.\d+|[01]) matches either 0 or 1 or a decimal number between 0 and 1  
   
  check('figure.backgroundColor')
    .custom(value => /^rgba\((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(0?\.\d+|[01])\)$/.test(value))
    .withMessage('invalid background color'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(202).send(errors.array()[0].msg);
    }
    next();
  }
];

module.exports = validateFields;