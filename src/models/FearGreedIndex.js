const { getDatabase } = require('../config/database');

class FearGreedIndex {
  static create(indexData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO fear_greed_index (date, value, classification)
      VALUES (?, ?, ?)
    `);
    
    return stmt.run(
      indexData.date,
      indexData.value || null,
      indexData.classification || null
    );
  }

  static findByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM fear_greed_index WHERE date = ?');
    return stmt.get(date);
  }

  static findByDateRange(startDate, endDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM fear_greed_index 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    return stmt.all(startDate, endDate);
  }

  static findAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM fear_greed_index ORDER BY date ASC');
    return stmt.all();
  }

  static getLatest() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM fear_greed_index ORDER BY date DESC LIMIT 1');
    return stmt.get();
  }

  static deleteByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM fear_greed_index WHERE date = ?');
    return stmt.run(date);
  }

  static count() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM fear_greed_index');
    return stmt.get().count;
  }

  static getDateRange() {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM fear_greed_index
    `);
    return stmt.get();
  }
}

module.exports = FearGreedIndex;
