const { string } = require('lib0');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const PreviewInfoSchema = new Schema({
  url: {
    type: String,
    requried: true
  },
  title: {
    type: String,
    requried: true
  },
  favicon: {
    type: String,
    requried: true
  },
  description: {
    type: String,
    requried: true
  },
  image: {
    type: String,
    requried: true
  },
  author: {
    type: String,
    requried: true
  },
  figureId: {
    type: String,
    required: true
  }
});
var PreviewInfoPost = mongoose.model('PreviewInfos', PreviewInfoSchema);

module.exports = PreviewInfoPost;