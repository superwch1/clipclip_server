const mongoose = require('mongoose');

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
    enum: ['preview', 'editor', 'image'],
  },
  width: {
    type: Number,
    min: 50,
    max: 1500,
    requried: true
  },
  height: {
    type: Number,
    min: 50,
    max: 1500,
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
    default: "#FFFFFF",
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
    min: 0,
    max: 20,
    requried: true
  }
});
var FigurePost = mongoose.model('Figures', FigureSchema);

module.exports = FigurePost;