Auto DB Migrations Plan (SQLite + better-sqlite3)

Goals
- Automatically apply DB schema/data migrations on app startup.
- No manual steps during deploys; safe, idempotent, and observable.
- Keep SQLite-friendly (single file, WAL), synchronous, and minimal dependencies.

Approach
- Use SQLite PRAGMA user_version to track current DB version (integer).
- Implement db/migrations.js exporting runMigrations(db) with an ordered array of synchronous migrations [(db) => void].
- On initDb():
  - applySchema(db) for base tables/indexes (CREATE IF NOT EXISTS).
  - runMigrations(db) unless MIGRATIONS_AUTO=0 (skip switch).
- Each migration runs inside a transaction; on error ROLLBACK and abort startup.
- After a migration completes, set PRAGMA user_version = N.
- Keep migrations idempotent where possible (check columnExists/values before altering/backfilling).

Initial migrations to port
1) Add caravans.kitchen_appliances TEXT; backfill from legacy flags
- If column missing: ALTER TABLE caravans ADD COLUMN kitchen_appliances TEXT.
- For rows with null/empty kitchen_appliances, set JSON array built from has_microwave/has_oven.

2) Rename camper_season values: winter -> all_season
- UPDATE caravans SET camper_season='all_season' WHERE LOWER(camper_season)='winter'.

Wire-in (db/db.js)
- import { runMigrations } from './migrations.js'
- In initDb() after applySchema(db):
  - if (process.env.MIGRATIONS_AUTO !== '0' && process.env.MIGRATIONS_AUTO !== 'false') runMigrations(db)
- Log concise progress (current version, applied N, done) and abort on failure.

Migration authoring template
- File: db/migrations.js
- Pattern (append at end, bump array length = new version):

  // Migration #X: <short description>
  (db) => {
    db.exec('BEGIN'); // optional if wrapping at runner-level
    try {
      // Example: guard for column
      const info = db.pragma('table_info(caravans)');
      const hasCol = Array.isArray(info) && info.some(c => c.name === 'new_col');
      if (!hasCol) db.exec('ALTER TABLE caravans ADD COLUMN new_col TEXT');

      // Example: data backfill
      const rows = db.prepare('SELECT id FROM caravans WHERE new_col IS NULL').all();
      const upd = db.prepare('UPDATE caravans SET new_col=? WHERE id=?');
      for (const r of rows) upd.run('value', r.id);
    } finally {
      // Runner handles COMMIT/ROLLBACK and user_version
    }
  },

Operational controls
- Skip switch: set MIGRATIONS_AUTO=0 to disable on startup (e.g., local debugging).
- Logging: console logs include current/target version, each applied step, and final version.
- Failure mode: throw to abort boot to avoid partial upgrades.

Backwards compatibility
- Keep existing CLI scripts in scripts/migrations/ for one-off/manual runs.
- Prefer new code-based migrations going forward; optionally port old scripts.

Testing strategy
- Local: start with fresh DB; verify PRAGMA user_version advances and features work.
- Upgrade: seed an older DB snapshot; verify auto-run applies migrations and app boots.
- Add a small script in tests/ to assert user_version and invariant checks (e.g., columns exist, values normalized).

Deployment
- Enable WAL (already enabled) for safer concurrent access.
- Recommended: backup DB file pre-deploy; on failure, roll back code and restore DB.

Docs (README snippet)
- Migrations run automatically on boot. To skip: MIGRATIONS_AUTO=0.
- To add a migration: edit db/migrations.js, append a new function at the end; keep it idempotent and fast.
