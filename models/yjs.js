const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const YjsSchema = new Schema({
  clock: {
    type: Number,
  },
  action: {
    type: String,
  },
  version: {
    type: String,
  },
  docName: {
    type: String
  },
  value: {
    type: Buffer.from([])
  },
});
var YjsPost = mongoose.model('Yjs-writings', YjsSchema);

module.exports = YjsPost;