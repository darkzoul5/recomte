# API v1 Migration — Execution Instructions

You are working in the `darkzoul5/recomte` repository. Execute the supplied API v1 migration plan, incorporating the review corrections below.

Your objective is to migrate first-party consumers to the existing versioned API while preserving the current public website behavior and maintaining backward compatibility.

## 1. Mandatory rules

1. Inspect the actual checked-out branch and repository state before making changes.
2. Do not assume the supplied migration plan accurately describes the current implementation. Verify every task against the source code.
3. Do not overwrite, discard, or revert existing uncommitted changes.
4. Do not switch branches or reset the working tree.
5. Preserve existing legacy API routes and their behavior.
6. Do not introduce unrelated refactoring, dependencies, database changes, or architectural redesigns.
7. Do not change the v1 API contract just to simplify consumer migration.
8. Do not introduce browser-side API calls. Public pages must continue using same-server Fastify injection.
9. Do not modify production infrastructure or trigger deployments.
10. Do not commit or push changes unless explicitly requested.

## 2. Start with repository verification

Inspect:

- `src/modules/pages/pages.controller.js`
- `src/modules/caravans/caravan.routes.js`
- `src/modules/caravans/caravan.v1.routes.js`
- `src/modules/caravans/caravan.service.js`
- `src/modules/admin/admin.api.routes.js`
- `src/modules/admin/admin.api.v1.routes.js`
- `src/server/setup.js`
- `src/server/public.js`
- `src/server/admin.js`
- `docs/api-v1.md`
- `scripts/verify-deployment-version.js`
- `.github/workflows/dev-build.yml`
- `.github/workflows/release-build.yml`
- `tests/test-api-v1.js`
- `tests/test-deployment-version.js`

Also search the entire repository for legacy API consumers and references, including workflows, scripts, documentation, templates, and JavaScript.

Determine which migration phases are already completed.

Do not repeat completed work.

## 3. Preserve public website behavior

Migrate these server-rendered page consumers:

| Page | Legacy endpoint | V1 endpoint |
| --- | --- | --- |
| Home | `/api/featured-caravans` | `/api/v1/caravans?featured=true&limit=6` |
| Catalogue | `/api/caravans` | `/api/v1/caravans` |
| Detail | `/api/caravans/:slug` | `/api/v1/caravans/:slug` |

### Pagination

The legacy catalogue returns all public caravans.

The v1 API defaults to 50 records and supports a maximum limit of 100.

Do not silently truncate the catalogue.

Implement server-side pagination in the page controller or its local adapter, retrieving all required pages until the reported total is reached.

Preserve the existing catalogue template inputs.

### Featured caravans

Compare the legacy and v1 implementations carefully.

The legacy implementation applies the database limit before filtering hidden records. The v1 implementation filters hidden records before pagination.

Determine the intended user-visible behavior and ensure the migration does not unintentionally change homepage selection or ordering.

Preserve the existing limit of six.

### Caravan details

Unwrap the v1 `data` envelope before passing the resource to:

- The EJS template.
- The SEO builder.

Preserve the current 404 page behavior.

Explicitly handle invalid slugs, missing resources, unexpected HTTP statuses, and malformed response bodies.

### Error handling

Every internal API request must validate:

- HTTP status.
- JSON parsing.
- Expected response structure.
- Expected collection/resource data type.

Never treat an error response as a successful resource.

Preserve the existing page fallback behavior. Do not expose internal error messages or stack traces to visitors.

### Architecture

Use `request.server.inject()` as currently implemented.

A small adapter/helper local to the pages module is acceptable if it removes duplicated response handling.

Do not introduce a generic HTTP client framework or unnecessary service abstractions.

## 4. Tests

Extend the existing tests rather than creating redundant test infrastructure.

Add coverage for:

- Homepage rendering using v1 featured results.
- Catalogue rendering with more than 50 records.
- Correct retrieval across multiple pages.
- Detail page rendering using the v1 resource envelope.
- Missing and invalid caravan slugs.
- Unexpected API status codes.
- Malformed JSON and malformed response envelopes.
- Existing empty-state and error behavior.
- SEO-critical output, including title, canonical URL, image, and structured data.

Verify that the v1 implementation does not expose hidden caravans publicly.

Where practical, compare legacy and v1 results against the same test database fixtures.

Do not rely exclusively on unit tests. Exercise the actual rendered page routes using Fastify injection.

Assertions should focus on user-visible behavior rather than incidental HTML formatting.

## 5. Deployment verification

Inspect the existing deployment verifier and both deployment workflows.

The dev and release workflows may already use `/api/v1/version`.

The verifier may already support both legacy and versioned response envelopes.

If these requirements are already satisfied, leave the implementation unchanged.

Correct `docs/api-v1.md` if it does not accurately describe the actual version response, including `api_version`, `version`, and `commit`.

Do not introduce unnecessary workflow modifications.

## 6. Admin API

Keep the admin API migration separate from the built-in admin UI.

The public and admin applications are separate Fastify servers. Their versioned routes may share paths without being the same HTTP service.

Do not introduce HTTP API calls into the existing admin UI, which currently uses direct service/controller operations.

Do not modify legacy admin API routes.

Inventory external consumers, but do not assume that unidentified external clients can be migrated automatically.

## 7. Compatibility and scope

The legacy endpoints must remain operational.

Do not implement legacy route removal, deprecation headers, or sunset dates as part of this execution.

Do not change:

- Database schemas or migrations.
- Caravan service behavior.
- Existing public API response formats.
- Existing administrative API response formats.
- Authentication or CSRF architecture.
- Deployment infrastructure.
- Public templates beyond changes strictly required for the migration.

If you discover a genuine v1 contract defect, document it separately rather than silently changing the API contract.

## 8. Execution procedure

Work incrementally.

1. Inspect the repository and establish the actual migration status.
2. Identify and report discrepancies between the plan and implementation.
3. Implement the public SSR migration.
4. Add regression tests.
5. Correct outdated API documentation.
6. Run the existing CI test commands, including:
   - Versioned API tests.
   - Deployment verification tests.
   - Database migration tests.
   - CSRF and authentication tests.
   - Public and admin HTTP smoke tests.
   - Linting.
7. Investigate and fix regressions introduced by your changes.
8. Review the final diff for unrelated modifications.

Do not stop after writing a proposed implementation. Actually implement and test the changes.

If a test cannot be executed because of an environmental limitation, clearly report it rather than claiming it passed.

## 9. Final report

When finished, provide:

1. Repository state and branch used.
2. Migration phases already completed before execution.
3. Files modified and a concise explanation of each change.
4. Any deviations from the supplied plan and why they were necessary.
5. Tests executed and their actual results.
6. Confirmation that legacy endpoints remain unchanged and operational.
7. Any remaining external consumers or migration work.
8. Any identified risks or follow-up tasks.

Do not claim production deployment or external client migration has occurred unless it was actually verified.
