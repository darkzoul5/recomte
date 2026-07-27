export const name = 'add brand and split length fields';

const columnExists = (db, tableName, columnName) => {
  const info = db.pragma(`table_info(${tableName})`);
  return Array.isArray(info) && info.some((column) => column?.name === columnName);
};

export const up = (db) => {
  if (!columnExists(db, 'caravans', 'brand')) {
    db.exec('ALTER TABLE caravans ADD COLUMN brand TEXT');
  }

  if (!columnExists(db, 'caravans', 'length_with_hitch_mm')) {
    db.exec('ALTER TABLE caravans ADD COLUMN length_with_hitch_mm INTEGER');
  }

  if (!columnExists(db, 'caravans', 'length_without_hitch_mm')) {
    db.exec('ALTER TABLE caravans ADD COLUMN length_without_hitch_mm INTEGER');
  }

  if (columnExists(db, 'caravans', 'length_mm')) {
    db.exec(`
      UPDATE caravans
      SET length_with_hitch_mm = COALESCE(length_with_hitch_mm, length_mm)
      WHERE length_mm IS NOT NULL
    `);
  }
};

export default { name, up };
