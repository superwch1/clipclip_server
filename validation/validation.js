import { check, validationResult } from 'express-validator';
import Config from '../config.js';

const backgroundColorRule = [
  // rgba(0,0,0,1) to rbga(255,255,255,0);
  // \d{1,2}?\d matches numbers from 0 to 99,  1\d{2} matches numbers from 100 to 199,
  // 2[0-4]\d matches numbers from 200 to 249,  25[0-5] matches numbers from 250 to 255.
  // (0?\.\d+|[01]) matches either 0 or 1 or a decimal number between 0 and 1

  check('figure.backgroundColor')
    .custom(value => /^rgba\((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(0?\.\d+|[01])\)$/.test(value))
    .withMessage('invalid background color')
];

const positionAndSizeRule = [
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
    .withMessage('invalid height')
];

const figureIdRule = [
  check('figure.id')
    .custom(value => /^[a-f0-9]{24}$/.test(value.slice(7)))
    .withMessage('invalid figure id'),
];

const figureRule = [
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
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(errors.array()[0].msg);
  }
  next();
};

const validateBackgroundColor = [...backgroundColorRule, handleValidation];
const validatePositionAndSize = [...positionAndSizeRule, handleValidation];
const validateFigureId = [...figureIdRule, handleValidation];
const validateFigure = [...figureRule, ...backgroundColorRule, ...positionAndSizeRule, handleValidation];

export { 
  validateBackgroundColor, 
  validatePositionAndSize, 
  validateFigureId, 
  validateFigure 
};