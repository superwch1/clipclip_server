const YjsPost = require('../models/yjs');

class YjsRepository {
  
  /** 
   * delete all writing with same docName
   */
  static async deleteAllWritings(docName) {
    await YjsPost.deleteMany({docName: docName});
  }


  /**
   * copy all writings and save with newDocName
   */
  static async copyAllWritings(previousDocName, newDocName) {
    var writings = await YjsPost.find({ docName: previousDocName});
    for (var i = 0; i < writings.length; i++) {
        var newWriting = new YjsPost({
        action: writings [i].action,
        clock: writings [i].clock,
        version: writings [i].version,
        docName: newDocName,
        value: writings [i].value
        });
        await newWriting.save()
    }
  }
}

module.exports = YjsRepository;