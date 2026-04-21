import { initDb, closeDb } from '../db/db.js';

const init = () => {
  try {
    console.log('🔧 Initializing database...');
    initDb();
    console.log('✓ Database schema created successfully');
    closeDb();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

init();
