# Repository Analysis

## Project

- Purpose: A Node.js web application for listing and managing European caravans for sale, with a public catalog and an admin area.
- Main technologies: Fastify, EJS, SQLite via `better-sqlite3`, Tailwind CSS, vanilla JavaScript, and Docker.
- Languages: JavaScript (ESM), EJS, CSS, YAML, Bash, JSON, and embedded SQL.
- Frameworks / libraries: Fastify, EJS, Tailwind CSS, Bulma, FilePond, PhotoSwipe, SortableJS, Argon2, and `dotenv`.

## Repository Structure

- `src/server/`: Server bootstrap and startup logic for the combined, public-only, and admin-only processes.
- `src/modules/`: Feature modules grouped by domain.
  - `caravans/`: Public caravan listing API and data hydration.
  - `pages/`: Server-rendered public pages.
  - `sitemap/`: `robots.txt` and sitemap generation.
  - `auth/`: Admin authentication, CSRF, and throttling.
  - `admin/`: Admin UI pages and admin CRUD API.
- `src/utils/`: Shared helpers for env validation, storage paths, site URLs, and input validation.
- `db/`: SQLite schema, database access layer, and migrations.
- `views/`: EJS templates for public pages, admin pages, and shared components.
- `public/`: Static assets served by Fastify, including CSS, browser JS, images, and vendored third-party assets.
- `scripts/`: Operational scripts for database init, migration, seed, backup, password reset, validation, and prod-to-test DB sync.
- `tests/`: Standalone Node.js test scripts for security checks and smoke checks.
- `.github/workflows/`: CI/CD workflow definitions.
- `docker/`: Dockerfile, entrypoint, and Compose configuration.
- `plans/`: Planning notes and draft documents.

## Build & Tooling

- Package manager: `pnpm` (`packageManager` is `pnpm@11.17.0`).
- Build commands:
  - `pnpm css:build` builds `public/css/website.css` from `public/css/tailwind.css`.
  - Docker image builds are defined in `.github/workflows/dev-build.yml` and `.github/workflows/release-build.yml` using `docker/Dockerfile`.
- Dev commands:
  - `pnpm start` runs `src/server/index.js`.
  - `pnpm start:public` runs the public server only.
  - `pnpm start:admin` runs the admin server only.
  - `pnpm css:watch` rebuilds the CSS bundle in watch mode.
- Test commands:
  - No `test` script is defined in `package.json`.
  - The repository includes standalone test scripts under `tests/` and CI runs them directly with `node`, including:
    - `node tests/test-sql-injection.js`
    - `node tests/test-xss-protection.js`
    - `node tests/test-db-migrations.js`
    - `node tests/test-csrf-protection.js`
    - `node tests/test-auth-protection.js`
    - `node tests/smoke-http.js`
- Linters:
  - ESLint is configured in `eslint.config.js`.
  - `pnpm lint` runs `eslint . --max-warnings=0`.
- Formatters:
  - No formatter configuration or formatter script is present in the files inspected.

## Configuration

- Important config files:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `eslint.config.js`
  - `renovate.json`
  - `cliff.toml`
  - `docker/compose.yml`
  - `docker/Dockerfile`
  - `.github/workflows/lint.yml`
  - `.github/workflows/test.yml`
  - `.github/workflows/dev-build.yml`
  - `.github/workflows/release-build.yml`
  - `.github/workflows/ntfy-on-pr.yml`
  - `.env.example`
  - `.gitignore`
- Environment files:
  - `.env.example` documents `NODE_ENV`, `PORT`, `ADMIN_PORT`, `HOST`, `DB_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `LOG_LEVEL`, `ADMIN_LOG_LEVEL`, `PUBLIC_LOG_LEVEL`, and `SESSION_SECRET`.
  - A `.env` file is present in the repository file list and is referenced by Docker Compose.
- Docker:
  - `docker/Dockerfile` builds a Node 24.18.0-slim image in a multi-stage build.
  - `docker/compose.yml` defines `app` and `app_test` services and uses an external `traefik-proxy` network.
  - `docker/entrypoint.sh` is copied into the runtime image and used as the container entrypoint.
- CI/CD:
  - GitHub Actions workflows exist for linting, tests, development builds, release builds, and PR notifications.
  - The dev and release workflows build and push Docker images to `git.darkzoul.org`.
  - The release workflow creates a git tag, generates release notes with `git-cliff`, and creates a GitHub release.
  - The dev and release workflows trigger deployment webhooks signed with `X-Gitea-Signature`.
  - `deploy.sh` is a standalone deployment script that pulls repo updates, pulls images, and runs `docker compose up -d`.

## Architecture

- High-level architecture:
  - A server-rendered Fastify application with two server entrypoints: public and admin.
  - Both servers share common plugin setup, shared SQLite storage, and shared runtime storage paths.
  - Public pages are rendered from EJS templates and also expose JSON endpoints for caravan data.
- Main components:
  - Public server: `src/server/public.js`
  - Admin server: `src/server/admin.js`
  - Shared server setup: `src/server/setup.js`
  - Database layer: `db/db.js`, `db/schema.js`, `db/migrations/`
  - Domain modules: caravans, pages, sitemap, auth, admin
- Database:
  - SQLite is used through `better-sqlite3`.
  - The schema defines `caravans`, `images`, `caravan_features`, `admin_users`, `sessions`, and `auth_throttle_state`.
  - Database initialization applies the base schema and migrations on startup.
  - Sessions are stored in SQLite through a custom session store.
  - Caravan images are stored on disk under the storage root, with file paths derived from image URLs.
- APIs:
  - Public JSON API:
    - `GET /api/caravans`
    - `GET /api/caravans/:slug`
    - `GET /api/featured-caravans`
  - Public pages:
    - `/`
    - `/caravans`
    - `/caravans/:slug`
    - `/contact`
    - `/privacy`
  - Sitemap / robots:
    - `/robots.txt`
    - `/sitemap.xml`
    - `/sitemap-index.xml`
  - Health checks:
    - `/healthcheck` on both servers
  - Admin auth:
    - `/admin/login`
    - `/admin/logout`
  - Admin UI:
    - `/admin`
    - `/admin/dash`
    - `/admin/edit/:id`
    - `/admin/new`
    - `/admin/delete/:id`
    - `/admin/edit/:id/delist`
    - `/admin/edit/:id/relist`
  - Admin JSON API:
    - `/admin/api/caravans`
    - `/admin/api/caravans/:id`
    - `/admin/api/caravans/:id/images`
    - `/admin/api/images/:id`
    - `/admin/api/images/:id/reorder`
- External services:
  - Yandex Metrika is referenced in `public/vendor/yandex-metrika/yandex-metrika.js` and `views/components/header/public.ejs`.
  - Yandex Maps embed is used on the contact page.
  - Yandex Webmaster and Yandex counter links appear in the admin dashboard template.
  - Font Awesome is loaded from a CDN in templates.
  - OpenStreetMap uMap is allowed in the content security policy.
  - `ntfy.darkzoul.org` is used by the PR notification workflow.
  - Traefik is used in `docker/compose.yml` for reverse proxying.

## Coding Conventions

Only conventions that are directly visible in the repository are listed here.

- Naming:
  - Modules use a consistent `*.controller.js`, `*.service.js`, `*.routes.js`, and `index.js` structure.
  - Shared helpers live under `src/utils/` and `src/server/`.
  - Route-registration functions are typically named `register*Routes`.
- File organization:
  - Feature code is split by domain rather than centralized in a single app file.
  - Public templates, admin templates, and shared components are separated under `views/`.
  - Static assets are grouped by asset type under `public/`.
- Import style:
  - The project uses ES module `import`/`export` syntax throughout.
  - Relative imports are used for most intra-repo references.
  - Some dependencies are imported dynamically in server setup.
- Error handling:
  - Request handlers typically wrap work in `try/catch` and log failures through `request.log`.
  - Scripts usually print errors and exit with a non-zero status.
  - Some helper functions return fallback values instead of throwing.
- Logging:
  - Fastify logging is configured centrally.
  - Non-production logging uses `pino-pretty`.
  - The database layer and operational scripts also write to `console`.
- Typing:
  - The codebase is plain JavaScript, not TypeScript.
  - Validation is handled with runtime checks and whitelists rather than static types.
- Async patterns:
  - Server startup and request handlers use `async`/`await`.
  - The database layer uses synchronous `better-sqlite3` calls inside async wrappers where needed.
  - Shutdown logic awaits server close operations before exiting.

## Developer Workflow

- Install dependencies with `corepack enable` and `pnpm install`.
- Create a `.env` file with the required admin, session, and runtime settings.
- Run the app with:
  - `pnpm start` for both servers
  - `pnpm start:public` for the public server only
  - `pnpm start:admin` for the admin server only
- Build or watch the CSS bundle with `pnpm css:build` or `pnpm css:watch`.
- Initialize, migrate, seed, or back up the database with the `pnpm db:*` scripts.
- Reset an admin password with `pnpm admin:passwd`.
- Run repository tests directly with `node tests/*.js` scripts; CI does this explicitly.
- Use `docker compose -f docker/compose.yml up -d`-style deployment on the server side, as reflected by `deploy.sh` and the Compose file.
- Sync a production SQLite snapshot into the test environment with `scripts/sync-prod-db-to-test.sh`.

## MCP Tools

- No MCP-specific configuration, tooling, or documentation was found in the repository files inspected.

