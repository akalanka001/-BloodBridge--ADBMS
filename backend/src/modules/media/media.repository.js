import { pool } from '../../db.js';

export class MediaRepository {
  async createMediaAsset({ fileName, originalName, mimeType, fileSizeBytes, storagePath, altText, uploadedBy }) {
    const { rows } = await pool.query(
      `INSERT INTO media_assets (
         file_name, original_name, mime_type, file_size_bytes, storage_path, alt_text, uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [fileName, originalName, mimeType, fileSizeBytes, storagePath, altText || null, uploadedBy],
    );
    return rows[0];
  }

  async getMediaById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM media_assets WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async deleteMedia(id, userId, userRole) {
    let query = 'DELETE FROM media_assets WHERE id = $1';
    const params = [id];
    if (userRole !== 'ADMIN') {
      query += ' AND uploaded_by = $2';
      params.push(userId);
    }
    query += ' RETURNING id, storage_path';
    const { rows } = await pool.query(query, params);
    return rows[0] || null;
  }
}

export const mediaRepository = new MediaRepository();
