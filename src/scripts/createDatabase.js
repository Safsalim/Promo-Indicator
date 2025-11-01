require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeSchema } = require('../models/schema');
const { closeDatabase } = require('../config/database');

console.log('Creating database...');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/promo-indicator.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

try {
  initializeSchema();
  console.log('Database created and schema initialized successfully!');
  console.log(`Database location: ${dbPath}`);
} catch (error) {
  console.error('Error creating database:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
