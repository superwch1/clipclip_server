import { check, validationResult } from 'express-validator';
import Config from '../config.js';
import validateBackgroundColor from './figureBackgroundColor.js';
import validatePositionAndSize from './figurePositionAndSize.js';

const validateFields = [

  check('figure.boardId')
    .isString()
    .custom(value => /^[a-z0-9_-]*$/.test(value))
    .withMessage('invalid figure boardId'),

  check('figure.type')
    .custom(value => (value === "editor" || value === "preview" || value === "image"))
    .withMessage('invalid figure type'),

  // reason for not using isURL() is because editor use empty url
  check('figure.url')
    .isString()
    .withMessage('invalid figure url'),

  check('figure.zIndex')
    .isNumeric()
    .custom(value => !(value < Config.figureMinZIndex || value > Config.figureMaxZIndex))
    .withMessage('invalid figure zIndex'),

  check('figure.isPinned')
    .isBoolean()
    .withMessage('invalid figure pin status'),

  ...validateBackgroundColor,

  ...validatePositionAndSize,

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(202).send(errors.array()[0].msg);
    }
    next();
  }
];

export default validateFields;
