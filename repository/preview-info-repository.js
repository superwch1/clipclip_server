import pool from '../db/pool.js';

/**
 * create preview info
 * @param {*} figureId
 * @param {*} url
 * @param {*} cheerioData
 * @returns properties of preview info
 */
async function createPreviewInfo(figureId, url, cheerioData) {
  const getMetaTag = (name) => {
    return (
      cheerioData(`meta[name=${name}]`).attr("content") ||
      cheerioData(`meta[propety="twitter${name}"]`).attr("content") ||
      cheerioData(`meta[property="og:${name}"]`).attr("content")
    );
  };

  const res = await pool.query(
    `INSERT INTO preview_infos (url, title, favicon, description, image, author, figure_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
    [
      url,
      cheerioData("title").first().text(),
      cheerioData('link[rel="shortcut icon"]').attr("href") || cheerioData('link[rel="alternate icon"]').attr("href"),
      getMetaTag("description"),
      getMetaTag("image"),
      getMetaTag("author"),
      figureId,
    ]
  );
  return res.rows[0];
}


/**
 * read preview info by figureId
 * @param {*} figureId
 * @returns preview info properties, null if not found
 */
async function readPreviewInfo(figureId) {
  const res = await pool.query('SELECT * FROM preview_infos WHERE figure_id = $1', [figureId]);
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    _id: row.id,
    figureId: row.figure_id,
    url: row.url,
    title: row.title,
    favicon: row.favicon,
    description: row.description,
    image: row.image,
    author: row.author,
  };
}


/**
 * delete post with same figureId
 * @param {*} id figureId
 */
async function deletePreviewInfoWithFigureId(id) {
  await pool.query('DELETE FROM preview_infos WHERE figure_id = $1', [id]);
}


/**
 * copy preview information and save with new figure id
 * @param {*} previousFigureId
 * @param {*} newFigureId
 */
async function copyPreviewInfo(previousFigureId, newFigureId) {
  await pool.query(
    `INSERT INTO preview_infos (url, title, favicon, description, image, author, figure_id)
      SELECT url, title, favicon, description, image, author, $1
      FROM preview_infos WHERE figure_id = $2`,
    [newFigureId, previousFigureId]
  );
}

export { createPreviewInfo, readPreviewInfo, deletePreviewInfoWithFigureId, copyPreviewInfo }
