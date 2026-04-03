import pool from '../db/pool.js';

/**
 * delete all writings with same docName
 * @param {*} docName
 */
async function deleteAllWritings(docName) {
  await pool.query('DELETE FROM "yjs-writings" WHERE docname = $1', [docName]);
}

export default { deleteAllWritings };
