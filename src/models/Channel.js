const { getDatabase } = require('../config/database');

class Channel {
  static create(channelData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO channels (channel_handle, channel_id, channel_name, is_active)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(
      channelData.channel_handle,
      channelData.channel_id || null,
      channelData.channel_name || null,
      channelData.is_active !== undefined ? channelData.is_active : 1
    );
  }

  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels WHERE id = ?');
    return stmt.get(id);
  }

  static findByHandle(handle) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels WHERE channel_handle = ?');
    return stmt.get(handle);
  }

  static findByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels WHERE channel_id = ?');
    return stmt.get(channelId);
  }

  static findAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels ORDER BY added_date DESC');
    return stmt.all();
  }

  static findActive() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels WHERE is_active = 1 ORDER BY added_date DESC');
    return stmt.all();
  }

  static update(id, channelData) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (channelData.channel_handle !== undefined) {
      fields.push('channel_handle = ?');
      values.push(channelData.channel_handle);
    }
    if (channelData.channel_id !== undefined) {
      fields.push('channel_id = ?');
      values.push(channelData.channel_id);
    }
    if (channelData.channel_name !== undefined) {
      fields.push('channel_name = ?');
      values.push(channelData.channel_name);
    }
    if (channelData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(channelData.is_active);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const stmt = db.prepare(`
      UPDATE channels 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    return stmt.run(...values);
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM channels WHERE id = ?');
    return stmt.run(id);
  }

  static setActive(id, isActive) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE channels SET is_active = ? WHERE id = ?');
    return stmt.run(isActive ? 1 : 0, id);
  }

  static count() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM channels');
    return stmt.get().count;
  }

  static countActive() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM channels WHERE is_active = 1');
    return stmt.get().count;
  }
}

module.exports = Channel;
