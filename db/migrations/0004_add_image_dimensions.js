export const name = 'add image dimensions';

export const up = (db) => {
  const columns = db.pragma('table_info(images)');
  const hasWidth = Array.isArray(columns) && columns.some((column) => column?.name === 'width');
  const hasHeight = Array.isArray(columns) && columns.some((column) => column?.name === 'height');

  if (!hasWidth) {
    db.exec('ALTER TABLE images ADD COLUMN width INTEGER');
  }

  if (!hasHeight) {
    db.exec('ALTER TABLE images ADD COLUMN height INTEGER');
  }
};

export default { name, up };
