const { getDatabase } = require('../config/database');

class Video {
  static create(videoData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO videos (id, channel_id, title, description, published_at, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      videoData.id,
      videoData.channel_id,
      videoData.title,
      videoData.description,
      videoData.published_at,
      videoData.thumbnail_url
    );
  }

  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id);
  }

  static findAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM videos ORDER BY published_at DESC');
    return stmt.all();
  }

  static update(id, videoData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE videos 
      SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(videoData.title, videoData.description, id);
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM videos WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = Video;
