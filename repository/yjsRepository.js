import pool from '../db/pool.js';

class YjsRepository {

  /**
   * delete all writings with same docName
   * @param {*} docName
   */
  static async deleteAllWritings(docName) {
    await pool.query('DELETE FROM "yjs-writings" WHERE docname = $1', [docName]);
  }
}

export default YjsRepository;
