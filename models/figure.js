const mongoose = require('mongoose');
const Config = require('../config')

const Schema = mongoose.Schema;
const FigureSchema = new Schema({
  _id: {
    type: String,
    default: function() {
      return 'figure_' + new mongoose.Types.ObjectId().toString();
    }
  },
  type: {
    type: String,
    requried: true,
    enum: Config.figureType,
  },
  width: {
    type: Number,
    min: Config.figureMinWidth,
    max: Config.figureMaxWidth,
    requried: true
  },
  height: {
    type: Number,
    min: Config.figureMinHeight,
    max: Config.figureMaxHeight,
    requried: true
  },
  x: {
    type: Number,
    requried: true
  },
  y: {
    type: Number,
    requried: true
  },
  backgroundColor : {
    type: String,
    default: "rgba(0,0,0,1)",
    // required: true - it will crash when receiving an empty string
  },
  url : {
    type: String,
    default: "",
    // required: true - it will crash when receiving an empty string
  },
  zIndex : {
    type: Number,
    default: 1,
    min: Config.minZIndex,
    max: Config.maxZIndex,
    requried: true
  },
  isPinned : {
    type: Boolean,
    required: true
  }
});
var FigurePost = mongoose.model('Figures', FigureSchema);

module.exports = FigurePost;