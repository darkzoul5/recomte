# AGENTS.md

## Repository Snapshot
- Project: Recomte
- Type: Node.js web app for European caravan listings
- Stack: Fastify, EJS, SQLite via `better-sqlite3`, Tailwind CSS, Docker
- Language: JavaScript in ESM mode
- Package manager: `pnpm`

## Observed Behavior
- Public and admin servers have separate entrypoints.
- The app serves server-rendered pages and public JSON endpoints.
- Database schema and migrations run on startup unless disabled.
- Runtime data is stored under `storage` by default.
- Tests are standalone Node scripts under `tests/`.
- ESLint is configured in `eslint.config.js`.
- Renovate is configured for dependency updates.

## Planned Changes
- JavaScript to TypeScript migration is open.
- Custom database access to Drizzle ORM is open.
- Drizzle Kit automatic migrations are open.
- Bulma and custom CSS to Tailwind CSS migration is open.
- Automated testing improvements are open.
- Authentication and admin security improvements are open.
- API layer improvements are open.
- Product image pipeline improvements are open.
- Structured SEO support is open.
- Catalogue functionality improvements are open.
- Repository documentation work is open.

## Editing Code
- Keep server code under `src/server/`.
- Keep domain code under `src/modules/`.
- Keep shared helpers under `src/utils/`.
- Keep browser JavaScript under `public/js/`.
- Keep the codebase in ESM JavaScript unless the TypeScript migration changes it.
- Respect the existing ESLint rule that allows `_`-prefixed unused variables.
- Treat `ym` as a read-only browser global in `public/js/**/*.ts`.

## Architecture
- Use the existing Fastify, EJS, and SQLite structure.
- Keep public and admin concerns separated.
- Keep the server-rendered pages and the JSON API both in place.
- Keep database schema and migration code under `db/`.
- Keep static assets under `public/`.
- Keep operational scripts under `scripts/`.
- Keep planning notes under `plans/`.

## Runtime and Storage
- Default storage root is `storage`.
- Default database path is `storage/db/app.db`.
- Caravan images live under `storage/images/caravans/`.
- Backups live under `storage/backups/`.
- `STORAGE_ROOT` overrides the storage root.
- `DB_PATH` overrides only the database file path.
- `MIGRATIONS_AUTO=0` disables automatic migrations.

## Testing
- There is no `pnpm test` script.
- Run repository tests directly with `node tests/*.ts`.
- Use `tests/test-db-migrations.ts` when changing migrations.
- Use `tests/test-auth-protection.ts` and `tests/test-csrf-protection.ts` when changing auth or admin flows.
- Use `tests/test-sql-injection.ts` and `tests/test-xss-protection.ts` when changing input handling or rendered output.
- Use `tests/smoke-http.ts` for smoke coverage.

## Documentation
- Read `README.md` before changing repo behavior or setup.
- Keep environment references aligned with `README.md` and `.env.example`.
- Use `repository-analysis.md` as a reference for the current codebase layout and workflows.

## Build and Run
- Use `corepack enable` and `pnpm install`.
- Use `pnpm start` for both servers.
- Use `pnpm start:public` for the public server only.
- Use `pnpm start:admin` for the admin server only.
- Use `pnpm css:build` to build the Tailwind CSS bundle.
- Use `pnpm css:watch` to rebuild the CSS bundle in watch mode.
- Use `pnpm lint` for ESLint.
- Use `pnpm db:init`, `pnpm db:seed`, `pnpm db:migrations`, and `pnpm db:backup` for database tasks.
- Use `pnpm admin:passwd` to reset the admin password.

## Dependencies
- Dependency updates are managed by Renovate.
- Renovate labels dependency work as `deps`.
- Major dependency updates require dependency-dashboard approval.
- Lockfile maintenance is enabled and scheduled for Mondays.

## Git Workflow
- Write a commit message when a task directly modifies code.

## Tool Usage
- Read `README.md` before making changes.
- Prefer available MCP tools over manual inspection when they can answer the question directly.
- Prefer semantic code search before broad text search when locating code by behavior.
- Use the filesystem for reading and editing repo files.
- Use the terminal for builds, tests, linters, dev servers, and artifact inspection.

## MCP Usage
- Use Gitea MCP for repository metadata, issues, pull requests, branches, commits, tags, and releases.
- Use Gitea MCP for open issue lists instead of Git commands.
- Use Gitea MCP when checking `dark_zoul/campersite` issue state or issue details.
- Avoid Git commands when Gitea MCP can provide the needed repository information.
