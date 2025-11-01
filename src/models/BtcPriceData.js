const { getDatabase } = require('../config/database');

class BtcPriceData {
  static create(priceData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO btc_price_data (date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      priceData.date,
      priceData.open || null,
      priceData.high || null,
      priceData.low || null,
      priceData.close || null,
      priceData.volume || null
    );
  }

  static findByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM btc_price_data WHERE date = ?');
    return stmt.get(date);
  }

  static findByDateRange(startDate, endDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM btc_price_data 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    return stmt.all(startDate, endDate);
  }

  static findAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM btc_price_data ORDER BY date ASC');
    return stmt.all();
  }

  static getLatest() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM btc_price_data ORDER BY date DESC LIMIT 1');
    return stmt.get();
  }

  static deleteByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM btc_price_data WHERE date = ?');
    return stmt.run(date);
  }

  static count() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM btc_price_data');
    return stmt.get().count;
  }

  static getDateRange() {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM btc_price_data
    `);
    return stmt.get();
  }
}

module.exports = BtcPriceData;
