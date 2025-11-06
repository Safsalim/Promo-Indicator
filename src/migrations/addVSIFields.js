const { getDatabase } = require('../config/database');

function addVSIFields() {
  const db = getDatabase();
  
  try {
    // Add views_ma7 column
    db.exec(`
      ALTER TABLE live_stream_metrics 
      ADD COLUMN views_ma7 REAL DEFAULT NULL
    `);
    console.log('Added views_ma7 column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('views_ma7 column already exists');
    } else {
      throw error;
    }
  }

  try {
    // Add vsi column
    db.exec(`
      ALTER TABLE live_stream_metrics 
      ADD COLUMN vsi INTEGER DEFAULT NULL
    `);
    console.log('Added vsi column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('vsi column already exists');
    } else {
      throw error;
    }
  }

  try {
    // Add vsi_classification column
    db.exec(`
      ALTER TABLE live_stream_metrics 
      ADD COLUMN vsi_classification TEXT DEFAULT NULL
    `);
    console.log('Added vsi_classification column');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('vsi_classification column already exists');
    } else {
      throw error;
    }
  }

  console.log('VSI fields migration completed successfully');
}

function calculateAndStoreMA7() {
  const db = getDatabase();
  
  // Get all channels
  const channels = db.prepare('SELECT id FROM channels').all();
  
  channels.forEach(channel => {
    console.log(`Calculating MA7 for channel ${channel.id}`);
    
    // Get all metrics for this channel ordered by date
    const metrics = db.prepare(`
      SELECT id, date, total_live_stream_views 
      FROM live_stream_metrics 
      WHERE channel_id = ? 
      ORDER BY date ASC
    `).all(channel.id);
    
    // Calculate 7-day moving average
    metrics.forEach((metric, index) => {
      if (index >= 6) { // Need at least 7 days for MA7
        const last7Days = metrics.slice(index - 6, index + 1);
        const ma7 = last7Days.reduce((sum, m) => sum + m.total_live_stream_views, 0) / 7;
        
        db.prepare(`
          UPDATE live_stream_metrics 
          SET views_ma7 = ? 
          WHERE id = ?
        `).run(ma7, metric.id);
      }
    });
  });
  
  console.log('MA7 calculation completed');
}

module.exports = {
  addVSIFields,
  calculateAndStoreMA7
};