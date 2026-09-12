![Status](https://uptime.darkzoul.org/api/badge/1/status?style=for-the-badge)
![Uptime](https://uptime.darkzoul.org/api/badge/1/uptime?style=for-the-badge)
![Cert-exp](https://uptime.darkzoul.org/api/badge/1/cert-exp?style=for-the-badge)
# Recomte

Recomte is a full-stack web application for presenting and managing a caravan sales catalogue. It has a public, server-rendered catalogue and detail pages alongside a separate authenticated administration interface for inventory and images.

**Live site:** [recomte.ru](https://recomte.ru)

## Highlights

* Public caravan catalogue, detail pages, sitemap, and robots.txt
* Separate public and admin Fastify servers
* Session-based admin authentication, login throttling, and CSRF protection
* Caravan image uploads, resizing, ordering, and gallery display
* SQLite persistence, schema initialization, versioned migrations, and backups
* Containerized production configuration and CI workflows

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js (ES modules) and pnpm |
| Web server | Fastify 5 with `@fastify/view`, sessions, multipart uploads, static files, compression, and forms |
| Rendering | EJS server-rendered templates |
| Data | SQLite via `better-sqlite3` |
| Authentication | `@fastify/session` with Argon2 password hashes |
| Front end | Tailwind CSS, FilePond, PhotoSwipe, and SortableJS |
| Image processing | Sharp |
| Quality | ESLint and Node-based integration/security tests |
| Operations | Docker Compose, Bash deployment scripts, and Renovate |

## Quick start

Requirements: Node.js, Corepack, and pnpm. SQLite is embedded through `better-sqlite3`; a separate database server is not required.

```bash
corepack enable
pnpm install
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell; `cp .env.example .env` on macOS/Linux), then set real credentials and a random session secret before starting the application:

```bash
pnpm start
```

`pnpm start` runs both servers:

| Service | Default address |
| --- | --- |
| Public site | `http://localhost:3000` |
| Admin site | `http://localhost:3001` |

To run just one service, use `pnpm start:public` or `pnpm start:admin`.

## Environment configuration

The application loads `.env` at startup. The values below are derived from the runtime configuration; variables marked **required** must be set for the applicable server to start.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | none | **Required.** One of `development`, `production`, or `test`. |
| `SESSION_SECRET` | none | **Required.** Session-signing secret; at least 32 characters. Generate a unique random value for every deployment. |
| `ADMIN_USERNAME` | none | **Required for the admin server.** Initial admin username. |
| `ADMIN_PASSWORD` | none | **Required for the admin server.** Initial admin password; at least 12 characters. It is hashed with Argon2. |
| `PORT` | `3000` | Public-server port. |
| `HOST` | `0.0.0.0` | Public-server bind address. |
| `ADMIN_PORT` | `3001` | Admin-server port. |
| `ADMIN_HOST` | `0.0.0.0` | Admin-server bind address. |
| `SERVER_MODE` | `all` | Used by `pnpm start`: `all`, `public`, or `admin`. The dedicated start commands select their server directly. |
| `STORAGE_ROOT` | `storage` | Root for runtime database, backups, and caravan images. |
| `DB_PATH` | `storage/db/app.db` | SQLite database path. Overrides the database location derived from `STORAGE_ROOT`. |
| `MIGRATIONS_AUTO` | enabled | Set to `0`, `false`, `no`, or `off` to skip automatic migrations at startup. |
| `MIGRATIONS_VERBOSE` | disabled | Enables migration-runner diagnostics when the runner is not invoked with an explicit verbosity setting. |
| `SITE_URL` | `https://recomte.ru` | Canonical public URL used by templates, sitemap, and robots.txt. |
| `ADMIN_URL` | `https://recomte.ru` | Admin origin used in the public site's frame-ancestor policy. Set it to the admin site's external URL in production. |
| `SESSION_COOKIE_SECURE` | `true` in production; otherwise `false` | Override secure-cookie detection with `true` or `false`; useful for local HTTP development. |
| `LOG_LEVEL` | `info` | Default Fastify/Pino log level for both servers. |
| `PUBLIC_LOG_LEVEL` | `LOG_LEVEL` | Public-server log level override. |
| `ADMIN_LOG_LEVEL` | `LOG_LEVEL` | Admin-server log level override. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `60000` | Login-route rate-limit window in milliseconds. |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `30` | Maximum login-route requests per rate-limit window. |
| `LOGIN_ATTEMPT_WINDOW_MS` | `600000` | Failed-login tracking window in milliseconds. |
| `LOGIN_MAX_FAILED_ATTEMPTS` | `10` | Failed attempts allowed before a lockout. |
| `LOGIN_LOCKOUT_MS` | `900000` | Login lockout duration in milliseconds. |

Minimal local configuration:

```env
NODE_ENV=development
SESSION_SECRET=replace-with-a-unique-random-secret-of-at-least-32-characters
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-password-of-at-least-12-characters
```

## Runtime storage and database

By default, runtime data is kept outside the source tree under `storage/`:

```text
storage/
|-- db/app.db
|-- backups/
`-- images/caravans/
```

The database schema is initialized on startup and versioned migrations run automatically unless `MIGRATIONS_AUTO` disables them. `DB_PATH` can point to a separate SQLite file; `STORAGE_ROOT` controls the default database, backup, and image locations.

Useful commands:

```bash
pnpm db:init        # initialize schema and run migrations
pnpm db:migrations  # force-run migrations
pnpm db:seed        # add sample caravan records
pnpm db:backup      # write a SQLite backup under storage/backups
pnpm admin:passwd   # reset an admin password
```

## Development and verification

```bash
pnpm lint
pnpm css:build
pnpm css:watch
node tests/test-sql-injection.js
node tests/test-xss-protection.js
node tests/test-db-migrations.js
node tests/test-csrf-protection.js
node tests/test-auth-protection.js
node tests/smoke-http.js
```

There is intentionally no `pnpm test` script; tests are standalone Node scripts. The smoke test requires the relevant server to be running.

## Deployment notes

The repository includes a multi-stage Docker image, Docker Compose configuration for production and a test instance, a deployment script, and an optional production-to-test database/image synchronization script. These are tailored to the project's private hosting environment (including its external reverse-proxy network and container registry); adapt the Compose file and deployment settings before using them elsewhere.

## Project layout

```text
db/                  SQLite schema and migrations
docker/              Container image and Compose configuration
public/              Static assets and browser JavaScript
scripts/             Database and operational scripts
src/server/          Server entry points and shared setup
src/modules/         Domain modules
tests/               Standalone Node test scripts
views/               EJS templates
```

## Repository status

This GitHub repository is a public mirror of the canonical Gitea repository. Deployment and project operations remain on the canonical repository.
