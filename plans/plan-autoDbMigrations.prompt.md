Auto DB Migrations Plan (SQLite + better-sqlite3)

Goals
- Automatically apply DB schema/data migrations on app startup.
- No manual steps during deploys; safe, idempotent, and observable.
- Keep SQLite-friendly (single file, WAL), synchronous, and minimal dependencies.

Approach
- Use SQLite PRAGMA user_version to track current DB version (integer).
- Implement migrations runner exporting runMigrations(db) with an ordered list of synchronous migrations.
- On initDb():
  - applySchema(db) for base tables/indexes (CREATE IF NOT EXISTS).
  - runMigrations(db) unless MIGRATIONS_AUTO=0 (skip switch).
- Each migration runs inside a single transaction; on error ROLLBACK and abort startup.
- After a migration completes, set PRAGMA user_version = N (exactly once per migration).
- Keep migrations idempotent where possible (check columnExists/values before altering/backfilling).

Implementation details (project-specific)
- Prefer better-sqlite3 transactions over manual BEGIN/COMMIT in migrations:
  - Runner wraps each migration in db.transaction(() => migration(db))()
  - Migration functions should not call BEGIN/COMMIT themselves
- Add a "downgrade guard":
  - If PRAGMA user_version > migrations.length, throw and abort (prevents older code running on newer DB).
- Add locking/resilience defaults during init/migrations:
  - db.pragma('busy_timeout = 5000') (or similar) to reduce transient lock failures
  - Optionally use BEGIN IMMEDIATE at the runner level if you see lock contention on startup
- Logging: include migration number + short name in logs (not only "applied N").
- Note: scripts/migrations/ currently exists but is empty in this repo; keep/replace that note accordingly.

Initial migrations to port
1) Add caravans.kitchen_appliances TEXT; backfill from legacy flags
- If column missing: ALTER TABLE caravans ADD COLUMN kitchen_appliances TEXT.
- For rows with null/empty kitchen_appliances, set JSON array built from has_microwave/has_oven.

2) Rename camper_season values: winter -> all_season
- UPDATE caravans SET camper_season='all_season' WHERE LOWER(camper_season)='winter'.

Wire-in (db/db.js)
- import { runMigrations } from './migrations/index.js'
- In initDb() after applySchema(db):
  - if (process.env.MIGRATIONS_AUTO !== '0' && process.env.MIGRATIONS_AUTO !== 'false') runMigrations(db)
- Log concise progress (current version, applied N, done) and abort on failure.

How migrations are handled (file strategy)
Decision: one file per migration
- Directory: db/migrations/
- Naming: 0001_add_kitchen_appliances.js, 0002_normalize_camper_season.js, ...
- Each file exports { name, up(db) } (synchronous) or default export.
- Runner loads files sorted by filename, then uses array index as the version (user_version = number of applied migrations).
- Pros: easier reviews, simpler reverts, less merge-conflict risk, cleaner history.
- Cons: small amount of file boilerplate, runner needs to discover/import files.

Migration authoring template
- Pattern (add a new numbered file in db/migrations/):

  // Migration #X: <short description>
  (db) => {
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
- Optional: keep a small CLI helper (e.g., scripts/migrate-db.js) for one-off/manual runs.
- Prefer new code-based migrations going forward.

Testing strategy
- Local: start with fresh DB; verify PRAGMA user_version advances and features work.
- Upgrade: seed an older DB snapshot; verify auto-run applies migrations and app boots.
- Add a small script in tests/ to assert user_version and invariant checks (e.g., columns exist, values normalized).

Deployment
- Enable WAL (already enabled) for safer concurrent access.
- Recommended: backup DB file pre-deploy; on failure, roll back code and restore DB.

Docs (README snippet)
- Migrations run automatically on boot. To skip: MIGRATIONS_AUTO=0.
- To add a migration: add a new numbered file under db/migrations/ (e.g. 0003_some_change.js); keep it idempotent and fast.
