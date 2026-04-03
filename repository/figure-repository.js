import pool from '../db/pool.js';
import Config from '../config.js';
import crypto from 'crypto';

function rowToFigure(row) {
  if (!row) return null;
  return {
    _id: row.id,
    boardId: row.board_id,
    type: row.type,
    width: parseFloat(row.width),
    height: parseFloat(row.height),
    x: parseFloat(row.x),
    y: parseFloat(row.y),
    backgroundColor: row.background_color,
    url: row.url,
    zIndex: row.z_index,
    isPinned: row.is_pinned,
  };
}

/**
 * create figure
 * @param {*} figure boardId, type, width, height, x, y, backgroundColor, url and zIndex
 * @returns figure properties, null if unsuccessful
 */
async function createFigure(figure) {
  const id = 'figure_' + crypto.randomBytes(12).toString('hex');
  const res = await pool.query(
    `INSERT INTO figures (id, board_id, type, width, height, x, y, background_color, url, z_index, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
    [
      id,
      figure.boardId,
      figure.type,
      figure.width,
      figure.height,
      figure.x,
      figure.y,
      figure.backgroundColor ?? 'rgba(0,0,0,1)',
      figure.url ?? '',
      figure.zIndex ?? 1,
      figure.isPinned,
    ]
  );
  return rowToFigure(res.rows[0]);
}


/**
 * create figure with Id
 * @param {*} figure id, boardId, type, width, height, x, y, backgroundColor, url and zIndex
 * @returns figure properties, null if unsuccessful
 */
async function createFigureWithId(figure) {
  const existing = await readFigure(figure.id);
  if (existing !== null) return null;

  const res = await pool.query(
    `INSERT INTO figures (id, board_id, type, width, height, x, y, background_color, url, z_index, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
    [
      figure.id,
      figure.boardId,
      figure.type,
      figure.width,
      figure.height,
      figure.x,
      figure.y,
      figure.backgroundColor ?? 'rgba(0,0,0,1)',
      figure.url ?? '',
      figure.zIndex ?? 1,
      figure.isPinned,
    ]
  );
  return rowToFigure(res.rows[0]);
}


/**
 * read all figures
 * @returns array of figures with their properties, null if no figures are found
 */
async function readAllFigures(boardId) {
  const res = await pool.query('SELECT * FROM figures WHERE board_id = $1', [boardId]);
  if (res.rows.length > 0) {
    return res.rows.map(rowToFigure);
  }
  return null;
}


/**
 * read figure with id
 * @param {*} id
 * @returns figure properties, null if not found
 */
async function readFigure(id) {
  const res = await pool.query('SELECT * FROM figures WHERE id = $1', [id]);
  return rowToFigure(res.rows[0] ?? null);
}


/**
 * update url of the figure with id
 * @param {*} id
 * @param {*} url updated url of figure
 * @returns figure properties, null if unsuccessful
 */
async function updateFigureUrl(id, url) {
  const res = await pool.query(
    'UPDATE figures SET url = $1 WHERE id = $2 RETURNING *',
    [url, id]
  );
  return rowToFigure(res.rows[0] ?? null);
}


/**
 * update the position of figure
 * @param {*} figure id, x, y, width and height
 * @returns figure properties, null if unsuccessful
 */
async function updateFigurePositionAndSize(figure) {
  const res = await pool.query(
    'UPDATE figures SET x = $1, y = $2, width = $3, height = $4 WHERE id = $5 RETURNING *',
    [figure.x, figure.y, figure.width, figure.height, figure.id]
  );
  return rowToFigure(res.rows[0] ?? null);
}


/**
 * update the background color of figure
 * @param {*} figure id and backgroundColor
 * @returns figure properties, null if unsuccessful
 */
async function updateFigureBackgroundColor(figure) {
  const res = await pool.query(
    'UPDATE figures SET background_color = $1 WHERE id = $2 RETURNING *',
    [figure.backgroundColor, figure.id]
  );
  return rowToFigure(res.rows[0] ?? null);
}


/**
 * delete figure with id
 * @param {*} id
 */
async function deleteFigure(id) {
  await pool.query('DELETE FROM figures WHERE id = $1', [id]);
}


/**
 * increase the zIndex by 1
 * @param {*} id
 * @returns figure properties, null if unsuccessful or already at max
 */
async function layerUpFigure(id) {
  const res = await pool.query('SELECT z_index FROM figures WHERE id = $1', [id]);
  if (!res.rows[0]) return null;
  const newValue = res.rows[0].z_index + 1;
  if (newValue > Config.figureMaxZIndex) return null;
  const updated = await pool.query(
    'UPDATE figures SET z_index = $1 WHERE id = $2 RETURNING *',
    [newValue, id]
  );
  return rowToFigure(updated.rows[0]);
}


/**
 * decrease zIndex by 1
 * @param {*} id
 * @returns figure properties, null if unsuccessful or already at min
 */
async function layerDownFigure(id) {
  const res = await pool.query('SELECT z_index FROM figures WHERE id = $1', [id]);
  if (!res.rows[0]) return null;
  const newValue = res.rows[0].z_index - 1;
  if (newValue < Config.figureMinZIndex) return null;
  const updated = await pool.query(
    'UPDATE figures SET z_index = $1 WHERE id = $2 RETURNING *',
    [newValue, id]
  );
  return rowToFigure(updated.rows[0]);
}


/**
 * update pin status
 * @param {*} id
 * @param {*} isPinned
 * @returns figure properties, null if unsuccessful
 */
async function updatePinStatusFigure(id, isPinned) {
  const res = await pool.query(
    'UPDATE figures SET is_pinned = $1 WHERE id = $2 RETURNING *',
    [isPinned, id]
  );
  return rowToFigure(res.rows[0] ?? null);
}

export { createFigure, createFigureWithId, readAllFigures, readFigure, updateFigureUrl, updateFigurePositionAndSize, updateFigureBackgroundColor, deleteFigure, layerUpFigure, layerDownFigure, updatePinStatusFigure }
