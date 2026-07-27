const columnExists = (db, tableName, columnName) => {
  const info = db.pragma(`table_info(${tableName})`);
  return Array.isArray(info) && info.some((column) => column?.name === columnName);
};

export const name = 'Add caravans.kitchen_appliances and backfill from legacy flags';

export const up = (db) => {
  if (!columnExists(db, 'caravans', 'kitchen_appliances')) {
    db.exec('ALTER TABLE caravans ADD COLUMN kitchen_appliances TEXT');
  }

  // Backfill only when kitchen_appliances is empty and at least one legacy flag is set.
  const rows = db.prepare(
    `
      SELECT id, has_microwave, has_oven
      FROM caravans
      WHERE (kitchen_appliances IS NULL OR TRIM(kitchen_appliances) = '')
        AND (COALESCE(has_microwave, 0) = 1 OR COALESCE(has_oven, 0) = 1)
    `
  ).all();

  if (rows.length === 0) return;

  const update = db.prepare('UPDATE caravans SET kitchen_appliances = ? WHERE id = ?');

  for (const row of rows) {
    const appliances = [];
    if (row.has_microwave === 1) appliances.push('microwave');
    if (row.has_oven === 1) appliances.push('oven');

    if (appliances.length === 0) continue;
    update.run(JSON.stringify(appliances), row.id);
  }
};

