require('dotenv').config();
const { initializeSchema } = require('../models/schema');
const { closeDatabase } = require('../config/database');

console.log('Initializing database...');

try {
  initializeSchema();
  console.log('Database initialized successfully!');
} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
