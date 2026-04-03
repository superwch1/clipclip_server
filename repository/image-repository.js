import pool from '../db/pool.js';

/**
 * save image to database
 * @param {*} figureId
 * @param {*} buffer image data
 * @param {*} format image format (jpeg, png, gif, webp, etc.)
 */
async function saveImage(figureId, buffer, format) {
  await pool.query(
    'INSERT INTO images (figure_id, data, format) VALUES ($1, $2, $3)',
    [figureId, buffer, format]
  );
}


/**
 * read image from database
 * @param {*} figureId
 * @returns { data: Buffer, format: string }, null if not found
 */
async function readImage(figureId) {
  const res = await pool.query(
    'SELECT data, format FROM images WHERE figure_id = $1',
    [figureId]
  );
  return res.rows[0] ?? null;
}


/**
 * delete image from database
 * @param {*} figureId
 */
async function deleteImage(figureId) {
  await pool.query('DELETE FROM images WHERE figure_id = $1', [figureId]);
}

export { saveImage, readImage, deleteImage }
