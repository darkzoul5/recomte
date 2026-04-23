import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './data/app.db';

try {
  // Open database connection
  const db = new Database(dbPath);
  
  // Check if required tables exist
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(row => row.name);
  
  const requiredTables = ['caravans', 'images', 'caravan_features'];
  const missingTables = requiredTables.filter(t => !tables.includes(t));
  
  db.close();
  
  if (missingTables.length > 0) {
    console.error(`✗ Database schema incomplete. Missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✓ Database is properly initialized');
  process.exit(0);
} catch (error) {
  console.error(`✗ Database validation failed: ${error.message}`);
  process.exit(1);
}
