import { check, validationResult } from 'express-validator';
import Config from '../config.js';

const validateFields = [
  check('figure.x')
    .custom((value, {req}) => !(0 > value || value + req.body.figure.width > Config.interfaceWidth))
    .withMessage('invalid x position'),

  check('figure.y')
  .custom((value, {req}) => !(0 > value || value + req.body.figure.height > Config.interfaceHeight))
    .withMessage('invalid y position'),

  check('figure.width')
    .custom(value => !(Config.figureMinWidth > value || Config.figureMaxWidth < value))
    .withMessage('invalid width'),

  check('figure.height')
  .custom(value => !(Config.figureMinHeight > value || Config.figureMaxHeight < value))
    .withMessage('invalid height'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(202).send(errors.array()[0].msg);
    }
    next();
  }
];

export default validateFields;
