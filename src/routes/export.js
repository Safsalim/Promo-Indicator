const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { calculateRSIWithDates } = require('../utils/indicators');

function formatCSV(data, channelInfo) {
  const headers = [
    'date',
    'youtube_views',
    'youtube_rsi',
    'live_stream_count',
    'excluded',
    'fear_greed_value',
    'fear_greed_classification',
    'btc_price_close',
    'btc_price_high',
    'btc_price_low',
    'btc_volume'
  ];

  if (channelInfo && channelInfo.length > 0) {
    headers.unshift('channel_name', 'channel_handle');
  }

  const rows = [headers.join(',')];

  data.forEach(row => {
    const values = [];
    
    if (channelInfo && channelInfo.length > 0) {
      values.push(escapeCsvValue(row.channel_name || ''));
      values.push(escapeCsvValue(row.channel_handle || ''));
    }
    
    values.push(
      row.date || '',
      row.youtube_views !== null && row.youtube_views !== undefined ? row.youtube_views : '',
      row.youtube_rsi !== null && row.youtube_rsi !== undefined ? row.youtube_rsi.toFixed(2) : '',
      row.live_stream_count !== null && row.live_stream_count !== undefined ? row.live_stream_count : '',
      row.is_excluded ? 'yes' : 'no',
      row.fear_greed_value !== null && row.fear_greed_value !== undefined ? row.fear_greed_value : '',
      escapeCsvValue(row.fear_greed_classification || ''),
      row.btc_price_close !== null && row.btc_price_close !== undefined ? row.btc_price_close.toFixed(2) : '',
      row.btc_price_high !== null && row.btc_price_high !== undefined ? row.btc_price_high.toFixed(2) : '',
      row.btc_price_low !== null && row.btc_price_low !== undefined ? row.btc_price_low.toFixed(2) : '',
      row.btc_volume !== null && row.btc_volume !== undefined ? row.btc_volume.toFixed(0) : ''
    );
    
    rows.push(values.join(','));
  });

  return rows.join('\n');
}

function escapeCsvValue(value) {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatJSON(data, channelInfo, filters) {
  const response = {
    export_date: new Date().toISOString(),
    date_range: {
      start: filters.start_date || null,
      end: filters.end_date || null
    },
    channels: channelInfo && channelInfo.length > 0 ? channelInfo.map(c => c.channel_handle) : [],
    data: data.map(row => {
      const entry = {
        date: row.date
      };

      if (channelInfo && channelInfo.length > 0) {
        entry.channel = {
          name: row.channel_name || null,
          handle: row.channel_handle || null
        };
      }

      entry.youtube = {
        views: row.youtube_views !== null && row.youtube_views !== undefined ? row.youtube_views : null,
        rsi: row.youtube_rsi !== null && row.youtube_rsi !== undefined ? parseFloat(row.youtube_rsi.toFixed(2)) : null,
        stream_count: row.live_stream_count !== null && row.live_stream_count !== undefined ? row.live_stream_count : null,
        excluded: row.is_excluded ? true : false
      };

      entry.fear_greed = {
        value: row.fear_greed_value !== null && row.fear_greed_value !== undefined ? row.fear_greed_value : null,
        classification: row.fear_greed_classification || null
      };

      entry.btc = {
        close: row.btc_price_close !== null && row.btc_price_close !== undefined ? parseFloat(row.btc_price_close.toFixed(2)) : null,
        high: row.btc_price_high !== null && row.btc_price_high !== undefined ? parseFloat(row.btc_price_high.toFixed(2)) : null,
        low: row.btc_price_low !== null && row.btc_price_low !== undefined ? parseFloat(row.btc_price_low.toFixed(2)) : null,
        volume: row.btc_volume !== null && row.btc_volume !== undefined ? parseFloat(row.btc_volume.toFixed(0)) : null
      };

      return entry;
    })
  };

  return JSON.stringify(response, null, 2);
}

function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

router.get('/export/data', (req, res) => {
  try {
    const { format = 'csv', start_date, end_date, channels, rsi_period = '14', include_excluded } = req.query;

    if (!['csv', 'json'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be "csv" or "json"'
      });
    }

    if (start_date && !isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'start_date must be in YYYY-MM-DD format'
      });
    }

    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'end_date must be in YYYY-MM-DD format'
      });
    }

    let channelIdsArray = null;
    if (channels) {
      try {
        if (Array.isArray(channels)) {
          channelIdsArray = channels.map(id => parseInt(id, 10));
        } else if (typeof channels === 'string') {
          channelIdsArray = channels.split(',').map(id => parseInt(id.trim(), 10));
        }

        if (channelIdsArray.some(id => isNaN(id) || id <= 0)) {
          return res.status(400).json({
            success: false,
            error: 'channels must be valid positive integers'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channels format'
        });
      }
    }

    const rsiPeriodValue = parseInt(rsi_period, 10);
    if (isNaN(rsiPeriodValue) || rsiPeriodValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'rsi_period must be a positive integer'
      });
    }

    const db = getDatabase();

    let dateConditions = [];
    let params = [];

    if (start_date) {
      dateConditions.push('date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      dateConditions.push('date <= ?');
      params.push(end_date);
    }

    const dateFilter = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';

    const allDatesQuery = `
      SELECT DISTINCT date FROM (
        SELECT date FROM live_stream_metrics ${dateFilter}
        UNION
        SELECT date FROM btc_price_data ${dateFilter}
        UNION
        SELECT date FROM fear_greed_index ${dateFilter}
      )
      ORDER BY date ASC
    `;

    const allDates = db.prepare(allDatesQuery).all(...params, ...params, ...params);

    let channelInfo = null;
    if (channelIdsArray && channelIdsArray.length > 0) {
      const channelQuery = `
        SELECT id, channel_handle, channel_name
        FROM channels
        WHERE id IN (${channelIdsArray.map(() => '?').join(',')})
      `;
      channelInfo = db.prepare(channelQuery).all(...channelIdsArray);
    }

    let youtubeMetrics = {};
    if (channelIdsArray && channelIdsArray.length > 0) {
      channelIdsArray.forEach(channelId => {
        let metricsQuery = `
          SELECT lsm.date, lsm.total_live_stream_views, lsm.live_stream_count, lsm.is_excluded,
                 c.channel_handle, c.channel_name
          FROM live_stream_metrics lsm
          JOIN channels c ON lsm.channel_id = c.id
          WHERE lsm.channel_id = ?
        `;
        const metricsParams = [channelId];

        if (start_date) {
          metricsQuery += ' AND lsm.date >= ?';
          metricsParams.push(start_date);
        }

        if (end_date) {
          metricsQuery += ' AND lsm.date <= ?';
          metricsParams.push(end_date);
        }

        // Filter out excluded days by default, unless explicitly requested
        if (!include_excluded || include_excluded !== 'true') {
          metricsQuery += ' AND lsm.is_excluded = 0';
        }

        metricsQuery += ' ORDER BY lsm.date ASC';

        const metrics = db.prepare(metricsQuery).all(...metricsParams);
        
        const rsiData = calculateRSIWithDates(
          metrics.map(m => ({
            date: m.date,
            total_live_stream_views: m.total_live_stream_views
          })),
          rsiPeriodValue
        );

        metrics.forEach(m => {
          const key = `${channelId}_${m.date}`;
          youtubeMetrics[key] = {
            views: m.total_live_stream_views,
            stream_count: m.live_stream_count,
            channel_handle: m.channel_handle,
            channel_name: m.channel_name,
            is_excluded: m.is_excluded || 0,
            rsi: rsiData[m.date] || null
          };
        });
      });
    } else {
      let metricsQuery = `
        SELECT lsm.date, SUM(lsm.total_live_stream_views) as total_views, 
               SUM(lsm.live_stream_count) as total_streams,
               MAX(lsm.is_excluded) as is_excluded
        FROM live_stream_metrics lsm
      `;
      const metricsParams = [];

      if (start_date || end_date || (!include_excluded || include_excluded !== 'true')) {
        metricsQuery += ' WHERE 1=1';
        if (start_date) {
          metricsQuery += ' AND lsm.date >= ?';
          metricsParams.push(start_date);
        }
        if (end_date) {
          metricsQuery += ' AND lsm.date <= ?';
          metricsParams.push(end_date);
        }
        // Filter out excluded days by default, unless explicitly requested
        if (!include_excluded || include_excluded !== 'true') {
          metricsQuery += ' AND lsm.is_excluded = 0';
        }
      }

      metricsQuery += ' GROUP BY lsm.date ORDER BY lsm.date ASC';

      const metrics = db.prepare(metricsQuery).all(...metricsParams);
      
      const rsiData = calculateRSIWithDates(
        metrics.map(m => ({
          date: m.date,
          total_live_stream_views: m.total_views
        })),
        rsiPeriodValue
      );

      metrics.forEach(m => {
        youtubeMetrics[m.date] = {
          views: m.total_views,
          stream_count: m.total_streams,
          is_excluded: m.is_excluded || 0,
          rsi: rsiData[m.date] || null
        };
      });
    }

    let btcData = {};
    let btcQuery = 'SELECT * FROM btc_price_data';
    const btcParams = [];
    
    if (start_date || end_date) {
      btcQuery += ' WHERE 1=1';
      if (start_date) {
        btcQuery += ' AND date >= ?';
        btcParams.push(start_date);
      }
      if (end_date) {
        btcQuery += ' AND date <= ?';
        btcParams.push(end_date);
      }
    }
    
    btcQuery += ' ORDER BY date ASC';
    
    const btcRecords = db.prepare(btcQuery).all(...btcParams);
    btcRecords.forEach(record => {
      btcData[record.date] = record;
    });

    let fngData = {};
    let fngQuery = 'SELECT * FROM fear_greed_index';
    const fngParams = [];
    
    if (start_date || end_date) {
      fngQuery += ' WHERE 1=1';
      if (start_date) {
        fngQuery += ' AND date >= ?';
        fngParams.push(start_date);
      }
      if (end_date) {
        fngQuery += ' AND date <= ?';
        fngParams.push(end_date);
      }
    }
    
    fngQuery += ' ORDER BY date ASC';
    
    const fngRecords = db.prepare(fngQuery).all(...fngParams);
    fngRecords.forEach(record => {
      fngData[record.date] = record;
    });

    const combinedData = [];
    
    if (channelIdsArray && channelIdsArray.length > 0) {
      channelIdsArray.forEach(channelId => {
        allDates.forEach(({ date }) => {
          const key = `${channelId}_${date}`;
          const ytMetric = youtubeMetrics[key];
          const btcMetric = btcData[date];
          const fngMetric = fngData[date];

          if (ytMetric || btcMetric || fngMetric) {
            combinedData.push({
              date,
              channel_name: ytMetric?.channel_name || null,
              channel_handle: ytMetric?.channel_handle || null,
              youtube_views: ytMetric?.views ?? null,
              youtube_rsi: ytMetric?.rsi ?? null,
              live_stream_count: ytMetric?.stream_count ?? null,
              fear_greed_value: fngMetric?.value ?? null,
              fear_greed_classification: fngMetric?.classification ?? null,
              btc_price_close: btcMetric?.close ?? null,
              btc_price_high: btcMetric?.high ?? null,
              btc_price_low: btcMetric?.low ?? null,
              btc_volume: btcMetric?.volume ?? null
            });
          }
        });
      });
    } else {
      allDates.forEach(({ date }) => {
        const ytMetric = youtubeMetrics[date];
        const btcMetric = btcData[date];
        const fngMetric = fngData[date];

        if (ytMetric || btcMetric || fngMetric) {
          combinedData.push({
            date,
            youtube_views: ytMetric?.views ?? null,
            youtube_rsi: ytMetric?.rsi ?? null,
            live_stream_count: ytMetric?.stream_count ?? null,
            fear_greed_value: fngMetric?.value ?? null,
            fear_greed_classification: fngMetric?.classification ?? null,
            btc_price_close: btcMetric?.close ?? null,
            btc_price_high: btcMetric?.high ?? null,
            btc_price_low: btcMetric?.low ?? null,
            btc_volume: btcMetric?.volume ?? null
          });
        }
      });
    }

    const filename = `sentiment-data-${start_date || 'all'}-to-${end_date || 'all'}.${format}`;
    
    if (format.toLowerCase() === 'csv') {
      const csvContent = formatCSV(combinedData, channelInfo);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else {
      const jsonContent = formatJSON(combinedData, channelInfo, { start_date, end_date });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(jsonContent);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      details: error.message
    });
  }
});

module.exports = router;
