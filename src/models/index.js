const Video = require('./Video');
const VideoStats = require('./VideoStats');
const Channel = require('./Channel');
const LiveStreamMetrics = require('./LiveStreamMetrics');
const FilteredVideo = require('./FilteredVideo');
const { initializeSchema } = require('./schema');

module.exports = {
  Video,
  VideoStats,
  Channel,
  LiveStreamMetrics,
  FilteredVideo,
  initializeSchema
};
