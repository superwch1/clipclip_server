import { check, validationResult } from 'express-validator';

const validateFields = [
  check('figure.id')
    .custom(value => /^[a-f0-9]{24}$/.test(value.slice(7)))
    .withMessage('invalid figure id'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(202).send(errors.array()[0].msg);
    }
    next();
  }
];

export default validateFields;
