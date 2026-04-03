const pool = require('../db/pool.cjs');

class YjsRepository {

  /**
   * delete all writings with same docName
   * @param {*} docName
   */
  static async deleteAllWritings(docName) {
    await pool.query('DELETE FROM "yjs-writings" WHERE docname = $1', [docName]);
  }
}

module.exports = YjsRepository;
