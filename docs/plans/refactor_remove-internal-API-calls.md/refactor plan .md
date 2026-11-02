# Recomte — Legacy API Removal and API v1 Consolidation Plan

## Objective

Refactor `darkzoul5/recomte` to eliminate the legacy, unversioned JSON API and all internal dependencies on it.

The final architecture must have:

- Server-rendered public pages accessing the shared service layer directly.
- Server-rendered admin pages continuing to access the shared service layer directly.
- API v1 as the sole JSON API for external consumers.
- API v1 providing all intended public and administrative capabilities previously available through the legacy API.
- No accidental changes to existing website behavior, data, SEO, authentication, or administrative workflows.

This is a compatibility and architectural consolidation project, not an application rewrite.

## 1. Mandatory execution rules

1. Inspect the actual checked-out branch, Git status, and current repository state before making changes.
2. Do not assume the current branch matches `main` or any previously reviewed branch.
3. Preserve existing uncommitted changes. Never reset, overwrite, or discard user work.
4. Verify the current implementation before treating any task below as incomplete.
5. Do not change the API v1 base path or introduce API v2.
6. Do not remove API v1 endpoints or weaken their existing validation, authentication, authorization, or CSRF protection.
7. Do not introduce browser-side API calls into the existing EJS application.
8. Do not introduce unnecessary abstractions, dependencies, database changes, or unrelated refactoring.
9. Do not change database schemas or migrations.
10. Do not commit, push, or deploy unless explicitly requested.
11. Do not remove a legacy endpoint until its v1 replacement has been verified and tested.
12. Distinguish exact behavioral compatibility from deliberate improvements. Document intentional behavior changes rather than silently changing them.

## 2. Initial repository audit

Inspect at least:

- `src/modules/pages/pages.controller.js`
- `src/modules/pages/pages.routes.js`
- `src/modules/pages/pages.service.js`
- `src/modules/caravans/caravan.routes.js`
- `src/modules/caravans/caravan.controller.js`
- `src/modules/caravans/caravan.v1.routes.js`
- `src/modules/caravans/caravan.service.js`
- `src/modules/admin/admin.api.routes.js`
- `src/modules/admin/admin.api.v1.routes.js`
- `src/modules/admin/admin.routes.js`
- `src/modules/admin/admin.controller.js`
- `src/modules/admin/admin.service.js`
- `src/modules/admin/index.js`
- `src/server/public.js`
- `src/server/admin.js`
- `src/server/setup.js`
- `src/utils/validation.js`
- `db/db.js`
- `docs/api-v1.md`
- `docs/plans/repository-analysis.md`
- `tests/test-api-v1.js`
- All other tests referencing either API.

Search the entire repository, not just source modules, for:

- `request.server.inject`
- `/api/caravans`
- `/api/featured-caravans`
- `/admin/api/`
- Legacy API route/controller imports
- `fetch`, `XMLHttpRequest`, Axios, and other HTTP clients
- API references in EJS templates, browser JavaScript, scripts, workflows, documentation, tests, and configuration.

Classify each match as:
1. A legacy API implementation.
2. A legacy API consumer.
3. An API v1 implementation or consumer.
4. A reference in documentation/history.
5. An unrelated endpoint, such as the external Gitea API.

Do not mistake unrelated APIs for Recomte's legacy API.

Produce an inventory of every legacy endpoint, its current behavior, and its v1 replacement before changing routes.

## 3. Establish the API compatibility matrix

The existing legacy public API provides:

| Legacy endpoint | Functionality | API v1 replacement |
|---|---|---|
| `GET /api/caravans` | Public caravan collection, filters, hydrated records | `GET /api/v1/caravans` |
| `GET /api/caravans/:slug` | Public caravan details | `GET /api/v1/caravans/:slug` |
| `GET /api/featured-caravans` | Featured collection, configurable limit | `GET /api/v1/caravans?featured=true&limit=N` |

The existing legacy admin API provides:

| Legacy endpoint | Functionality | API v1 replacement |
|---|---|---|
| `GET /admin/api/caravans` | List all admin caravans, including hidden | `GET /api/v1/caravans` on admin server |
| `GET /admin/api/caravans/:id` | Get admin caravan by ID | `GET /api/v1/caravans/:id` on admin server |
| `POST /admin/api/caravans` | Create caravan | `POST /api/v1/caravans` |
| `PUT /admin/api/caravans/:id` | Update caravan, including optional `image_order` | `PUT /api/v1/caravans/:id` |
| `DELETE /admin/api/caravans/:id` | Delete caravan and its images | `DELETE /api/v1/caravans/:id` |
| `POST /admin/api/caravans/:id/images` | Add image metadata | `POST /api/v1/caravans/:id/images` |
| `DELETE /admin/api/images/:id` | Delete image and associated file | `DELETE /api/v1/images/:id` |
| `PUT /admin/api/images/:id/reorder` | Set image sort order | `PATCH /api/v1/images/:id` |

Public and admin APIs are served by separate Fastify servers. Identical v1 paths on these servers are intentional and must remain supported.

### Required compatibility checks

Do not assume that similar endpoint names mean equivalent behavior.

Compare:
- HTTP methods and paths.
- Query parameters and defaults.
- Request body fields and accepted formats.
- Response resource fields and hydration.
- Success status codes.
- Error status codes and response shapes.
- Filtering and sorting.
- Hidden-record handling.
- Authentication and CSRF requirements.
- Image file deletion and ordering behavior.
- Side effects and database changes.

The v1 contract may retain cleaner response envelopes and more consistent validation than the legacy API. Exact legacy status-code behavior is not automatically required, but all useful operations and intended functionality must remain available.

## 4. Public API v1 parity

### 4.1 Collection endpoint

Verify `GET /api/v1/caravans` supports all useful legacy collection functionality:

- Public records only.
- Newest-first ordering.
- Hydrated images and feature data.
- `status`.
- `camper_season`.
- `winter_rated`.
- `feature_key`.
- `feature_value`.
- Pagination.
- Featured filtering.

Important behavior differences to resolve:

1. Legacy `winter_rated=true` selects `all_season`. Legacy `winter_rated=false` does not apply an additional filter. V1 currently interprets `false` as excluding `all_season`. Decide whether to preserve the legacy meaning or intentionally adopt the more useful v1 behavior. Document and test the decision.
2. Legacy feature searching replaces the other filters when `feature_key` is supplied. V1 combines feature search with other filters. Prefer the composable v1 behavior, but explicitly document this improvement.
3. Legacy `status=hidden` effectively returns no records because the public service excludes hidden caravans. V1 must continue excluding hidden records even if that status is requested.
4. V1 currently defaults to 50 results and permits a maximum of 100. Keep pagination and its metadata.
5. Confirm that feature filtering, season filtering, featured filtering, and status filtering work together correctly.
6. Verify `feature_value` behavior when omitted, empty, or supplied.

### 4.2 Featured collection

V1 must fully replace the functionality of `GET /api/featured-caravans`.

Requirements:
- `featured=true` returns featured public caravans.
- `limit` controls the number of results.
- Ordering is newest first.
- Images and feature data are hydrated.
- Pagination metadata is correct.
- Hidden caravans are never exposed.

Important existing difference:

Legacy `getFeaturedCaravans(limit)` applies the database limit before filtering hidden records. V1 filters hidden records before applying pagination.

Prefer the logical v1 behavior of returning up to the requested number of visible featured records. Confirm that this is the desired product behavior and cover it with tests.

There is no need to add a separate `/api/v1/featured-caravans` endpoint if the collection endpoint with `featured=true` fully covers the use case.

### 4.3 Detail endpoint

Verify `GET /api/v1/caravans/:slug` supports:
- Existing public caravan retrieval.
- Full hydrated resource data.
- Invalid slug response.
- Missing resource response.
- Hidden resource response.
- Consistent error envelope.

The endpoint must not expose hidden caravans.

## 5. Admin API v1 parity

The admin API is more important to audit carefully because it supports destructive operations.

### 5.1 Caravan CRUD

Verify:
- Admin list includes hidden records.
- Detail retrieval includes the complete hydrated admin resource.
- Creation supports the complete caravan model and feature fields.
- Update supports the complete intended model.
- Deletion removes associated image records and stored image files.
- Missing resource handling is explicit.
- Duplicate unique fields return a conflict response.
- Invalid data returns an appropriate validation response.

Preserve session authentication and CSRF protection on all write operations.

### 5.2 Missing image-order functionality

A concrete parity gap exists.

The legacy `PUT /admin/api/caravans/:id` handler supports:

`request.body.image_order`

It calls `applyImageOrder()` after updating the caravan.

The current v1 update handler does not do this.

Implement equivalent functionality in v1, preferably by reusing the existing `applyImageOrder()` service function.

Requirements:
- Accept the existing comma-separated image ID representation, unless a deliberate new contract is documented.
- Only reorder images belonging to the specified caravan.
- Preserve the existing service's ordering semantics.
- Validate the caravan ID and resource existence.
- Add tests for valid ordering, invalid IDs, unrelated image IDs, empty input, and unchanged order when omitted.

Do not duplicate the image-ordering implementation.

### 5.3 Image operations

Verify complete support for:

- Creating image metadata for an existing caravan.
- Validating image URLs and metadata.
- Returning the created image.
- Updating image order.
- Deleting image records.
- Deleting associated stored files when appropriate.
- Returning `404` for missing caravans or images.
- Preventing invalid IDs and sort orders.

The v1 image reorder operation is `PATCH /api/v1/images/:id`, replacing legacy `PUT /admin/api/images/:id/reorder`.

Keep the v1 method and path unless a genuine compatibility problem is discovered. Document the difference.

### 5.4 Admin functionality boundaries

The built-in admin interface currently uses `admin.controller.js` and `admin.service.js` directly. Keep this architecture.

Do not:
- Convert EJS admin pages into API clients.
- Introduce HTTP calls between the admin UI and its own server.
- Remove admin HTML routes.
- Remove `admin.service.js` functionality used by the admin UI.

The goal is to remove the legacy JSON API, not the server-rendered admin interface.

## 6. Improve and test shared service boundaries

The public page controllers should use `caravan.service.js` directly.

Replace the internal `request.server.inject()` calls in `pages.controller.js` with direct service calls:

| Page | Service operations |
|---|---|
| Homepage | `getFeaturedCaravans(6)` and `hydrateCaravan` |
| Catalogue | `getAllCaravans()` and `hydrateCaravan` |
| Caravan detail | `getCaravanBySlug()` and `hydrateCaravan` |

Requirements:
- Preserve EJS template inputs.
- Preserve SEO metadata generation.
- Preserve canonical URLs, Open Graph images, structured data, and page titles.
- Preserve public visibility rules.
- Preserve 404 behavior for missing or hidden caravans.
- Preserve existing fallback behavior for unexpected errors.
- Keep internal errors out of public responses.

Do not call API route handlers directly from page controllers.

Do not introduce a new HTTP client or generic API adapter.

The API v1 routes should continue calling the same shared services.

## 7. Build a comprehensive regression test suite

Extend the existing test infrastructure where practical. Avoid creating redundant test frameworks.

### Public API tests

Cover:
- Collection with no filters.
- Empty collection.
- Featured filtering.
- Featured limits.
- Pagination boundaries.
- Multiple pages.
- Accurate `pagination.total`.
- Season filters.
- Winter-rated true and false semantics.
- Status filtering.
- Feature-key filtering.
- Feature-value filtering.
- Combined filters.
- Hidden record exclusion.
- Hydrated images and feature data.
- Valid detail slug.
- Invalid detail slug.
- Missing detail slug.
- Hidden detail slug.
- Error envelopes and status codes.

Use fixtures that include:
- More than 100 public caravans.
- Featured and non-featured records.
- Hidden records.
- Different seasons.
- Records with multiple images.
- Records with different feature values.

### Admin API tests

Cover:
- Unauthenticated access.
- Authenticated access.
- Missing/invalid CSRF.
- Admin list including hidden records.
- Admin detail.
- Create.
- Update.
- Update with `image_order`.
- Delete caravan and its images.
- Create image.
- Reorder image.
- Delete image and associated file.
- Invalid IDs.
- Missing resources.
- Invalid request bodies.
- Validation errors.
- Unique conflicts.
- Zero price.
- Complete feature mapping.

Verify that failed operations do not leave partial or inconsistent database state.

### Public page tests

Exercise actual Fastify page routes through `inject()`.

Verify:
- Homepage renders with featured records.
- Catalogue renders all records, not just the first 50 or 100.
- Caravan detail renders correctly.
- Missing/hidden caravan produces the expected 404.
- SEO title and description.
- Canonical URL.
- Open Graph image.
- Structured data.
- Expected template input structure.
- Empty and error fallback behavior.

Do not use internal API requests to test the pages. The test should exercise the page route and its direct service dependencies.

### Compatibility testing

Before deleting the old route implementations, compare legacy and v1 behavior using identical fixtures.

For each operation, assert the intended equivalent data and side effects.

Where behavior is deliberately improved, document the change and assert the new behavior.

Do not keep the legacy implementation permanently just to run compatibility tests. Use test fixtures and expected behavior as the reference.

## 8. Remove internal legacy API dependencies

After v1 parity and direct-service page tests pass:

1. Update `pages.controller.js` to use services directly.
2. Remove `request.server.inject()` from page controllers.
3. Search for any other internal requests to legacy API endpoints.
4. Migrate or remove every identified first-party consumer.
5. Do not replace internal legacy calls with internal v1 calls. Use the service layer.

The built-in admin UI already uses services directly and should remain unchanged unless the audit finds a real legacy API dependency.

## 9. Remove legacy API route registrations and implementation

Only after all compatibility tests pass:

### Public server
- Remove registration of `registerCaravansRoutes` from `src/server/public.js`.
- Keep registration of `registerCaravanV1Routes`.
- Remove `src/modules/caravans/caravan.routes.js` if no longer referenced.
- Remove `src/modules/caravans/caravan.controller.js` if no longer referenced.
- Update `src/modules/caravans/index.js` exports accordingly.
- Preserve `caravan.service.js`.

### Admin server
- Remove registration of `registerAdminApiRoutes` from `src/server/admin.js`.
- Keep registration of `registerAdminApiV1Routes`.
- Remove `src/modules/admin/admin.api.routes.js` if no longer referenced.
- Update `src/modules/admin/index.js` exports accordingly.
- Preserve admin HTML routes, controllers, services, authentication and upload functionality.

### Admin catch-all
Inspect `src/modules/admin/admin.routes.js`.

It currently has a special `/admin/api/` 404 condition in its catch-all route. After removing the legacy API registration, determine whether this is still useful.

Keep explicit 404 behavior for removed legacy paths if it prevents accidental fall-through or redirects. Do not leave dead or misleading compatibility code.

### No compatibility aliases
Do not leave unversioned aliases that silently redirect to or proxy API v1.

The purpose is to have one supported JSON API, not two paths to the same contract.

## 10. Documentation and repository cleanup

Update `docs/api-v1.md`:
- Remove the statement that unversioned APIs remain available.
- Document that API v1 is the sole supported JSON API.
- Document public and admin server separation.
- Document all endpoint methods, paths, query parameters, request fields, response envelopes, status codes, authentication and CSRF.
- Document pagination and filtering semantics.
- Document image-ordering behavior.
- Document the deliberate differences from the former legacy API where relevant.

Update `docs/plans/repository-analysis.md` and other maintained documentation to remove outdated legacy API inventories.

Update tests that assert legacy route availability. Replace them with assertions that legacy endpoints are no longer registered.

Remove obsolete imports and exports.

Do not remove historical changelog entries or historical documentation whose purpose is to record past behavior. Correct current architectural documentation instead.

## 11. Verify that the legacy API is completely gone

Perform a repository-wide search after implementation.

There must be no:
- Legacy route registrations.
- Imports of removed legacy route modules.
- Imports of removed legacy controllers.
- Internal `request.server.inject()` calls targeting legacy endpoints.
- Browser-side calls to legacy endpoints.
- Scripts or workflows consuming legacy endpoints.
- Active tests depending on legacy endpoint availability.
- Current documentation claiming the legacy API is supported.

Expected legacy paths that must no longer be registered:

Public server:
- `GET /api/caravans`
- `GET /api/caravans/:slug`
- `GET /api/featured-caravans`

Admin server:
- `GET /admin/api/caravans`
- `GET /admin/api/caravans/:id`
- `POST /admin/api/caravans`
- `PUT /admin/api/caravans/:id`
- `DELETE /admin/api/caravans/:id`
- `POST /admin/api/caravans/:id/images`
- `DELETE /admin/api/images/:id`
- `PUT /admin/api/images/:id/reorder`

Verify the old paths return `404` on the correct server and do not accidentally match a catch-all or another route.

Do not flag unrelated external APIs, such as Gitea's own `/api/v1/` endpoints.

## 12. CI and verification

Inspect existing workflows and test scripts before adding new commands.

Run:
- `pnpm lint`
- Existing API v1 tests.
- New public API regression tests.
- New admin API regression tests.
- Public page integration tests.
- Deployment version tests.
- Database migration tests.
- CSRF and authentication tests.
- Public and admin HTTP smoke tests.

Verify:
- Both public and admin servers start.
- Public API v1 works.
- Admin API v1 works with authentication and CSRF.
- Legacy paths return 404.
- Website pages render correctly.
- Admin HTML workflows remain functional.
- No unexpected database changes.
- No unrelated modifications.

Do not claim a test passed unless it was actually executed successfully. If environment limitations prevent a test from running, report that explicitly.

## 13. Execution order

Use this order to avoid removing functionality prematurely:

1. Inspect branch, working tree and repository.
2. Produce the complete legacy API consumer and endpoint inventory.
3. Build the legacy-to-v1 compatibility matrix.
4. Identify and implement missing v1 functionality.
5. Add public and admin API regression tests.
6. Verify all v1 operations and behavior.
7. Refactor public EJS page controllers to call services directly.
8. Add page integration and SEO regression tests.
9. Search for and eliminate all remaining internal legacy API consumers.
10. Remove legacy public and admin API registrations.
11. Remove unused legacy route/controller modules and exports.
12. Update current documentation.
13. Run the complete test and lint suite.
14. Perform a final repository-wide search and diff review.

If the compatibility audit reveals additional missing functionality, implement and test it before proceeding to route removal.

If an operation is obsolete or its behavior is intentionally changed, document the reason and verify that no first-party consumer still depends on it.

## 14. Final acceptance criteria

The work is complete only when all of the following are true:

- [ ] Public EJS pages access services directly.
- [ ] Admin EJS pages continue accessing services directly.
- [ ] No internal API calls remain for the old endpoints.
- [ ] API v1 provides all intended legacy public functionality.
- [ ] API v1 provides all intended legacy admin functionality.
- [ ] Caravan image ordering through caravan update is supported in v1.
- [ ] Public filtering, featured selection, pagination and detail retrieval are tested.
- [ ] Admin CRUD and image operations are tested.
- [ ] Authentication and CSRF protections remain intact.
- [ ] Website rendering and SEO behavior are preserved.
- [ ] Legacy public API routes are no longer registered.
- [ ] Legacy admin API routes are no longer registered.
- [ ] Legacy route/controller modules have been removed if unused.
- [ ] API v1 remains available and documented as the sole JSON API.
- [ ] Old endpoint requests return 404.
- [ ] Admin HTML functionality remains operational.
- [ ] CI and lint checks pass, or any environmental limitations are clearly reported.
- [ ] No unrelated changes are present.

## 15. Final report

Provide:

1. Branch and initial working-tree state.
2. Complete legacy endpoint and consumer inventory.
3. Compatibility matrix and gaps discovered.
4. V1 functionality added or corrected.
5. Public page refactoring performed.
6. Legacy route registrations and files removed.
7. Documentation updated.
8. Tests executed and their actual results.
9. Confirmation that API v1 remains functional.
10. Confirmation that legacy paths return 404.
11. Any deliberate behavior changes and their justification.
12. Remaining limitations or follow-up work.

Do not commit, push, or deploy as part of this task.