# API v1 Migration Plan

## Goal

Migrate first-party consumers from the legacy API routes to `/api/v1/` without changing the rendered public experience, breaking external clients, or removing compatibility routes before their consumers have moved.

The migration should be staged:

1. Stabilize and verify the v1 contract.
2. Migrate the public server-rendered pages.
3. Migrate deployment and operational checks.
4. Migrate any external and administrative API clients.
5. Deprecate and eventually remove legacy routes only after measured adoption.

## Current State

### Public pages

The public pages are server-rendered. They call legacy routes internally through Fastify injection in `src/modules/pages/pages.controller.js`:

| Page | Current internal route | Planned v1 route |
| --- | --- | --- |
| Home | `GET /api/featured-caravans` | `GET /api/v1/caravans?featured=true&limit=6` |
| Catalogue | `GET /api/caravans` | `GET /api/v1/caravans` |
| Caravan detail | `GET /api/caravans/:slug` | `GET /api/v1/caravans/:slug` |

These are not browser-side API calls. The controller injects requests into the same Fastify instance and renders EJS templates with the result.

### Admin UI

The built-in admin pages use direct service calls and HTML form flows in `src/modules/admin/admin.controller.js`. No current browser JavaScript consumer of `/admin/api/` or `/api/v1/` was found. The admin v1 API should therefore be treated as an integration surface unless a separate admin client is introduced.

### Deployment checks

The dev deployment verifier uses `/api/v1/version`. The verifier must accept the v1 response envelope while retaining support for the legacy `{ version, commit }` shape until release deployment checks are migrated.

### Existing compatibility routes

Legacy public routes remain in `src/modules/caravans/caravan.routes.js`. Legacy admin API routes remain in `src/modules/admin/admin.api.routes.js`. They must stay operational throughout the migration window.

## Contract Differences To Handle

### Public collection

Legacy:

```json
{
  "caravans": []
}
```

V1:

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0
  }
}
```

The catalogue page must read `response.data`, not `response.caravans`.

### Public detail

Legacy detail responses return the caravan object directly. V1 returns:

```json
{
  "data": {}
}
```

The detail page must unwrap `response.data` before passing the caravan to the EJS view and SEO builder.

### Featured home page

The legacy featured endpoint has a default limit of six. The v1 equivalent must explicitly request `featured=true&limit=6` so the home page keeps the same result count and selection behavior.

### Error behavior

V1 resource and validation errors use `{ error: { code, message } }`; legacy errors use a simpler `{ error: "..." }` or page-specific response. Page controllers must preserve current user-facing behavior:

- A missing detail resource still renders the existing 404 page.
- Catalogue/home failures still render the existing empty-state page.
- Internal error details must not be exposed in rendered pages.

## Migration Phases

## Phase 0: Inventory and Contract Freeze

**Purpose:** establish the migration boundary before changing consumers.

Tasks:

- Keep `docs/api-v1.md` as the v1 contract reference.
- Confirm every v1 route has explicit tests for success, validation, missing resources, status codes, and response envelopes.
- Record all known legacy consumers:
  - `src/modules/pages/pages.controller.js`
  - deployment verification workflows
  - external integrations using `/api/*` or `/admin/api/*`
- Decide whether the v1 public collection default of `limit=50` is sufficient for the catalogue page.
- Confirm whether v1 should expose a separate featured collection route before migrating the home page. Prefer the documented `featured=true` filter.

Exit gate:

- The v1 response schema is approved and changes require an intentional API contract update.
- Tests cover the v1 endpoints used by the first consumer migration.

## Phase 1: Stabilize V1 and Operational Verification

**Purpose:** make v1 safe to consume before changing page rendering.

Tasks:

- Keep `/api/v1/version` returning:
  - `api_version`
  - application `version`
  - `commit`
- Keep `/api/version` unchanged while legacy deployment checks or clients still use it.
- Ensure the deployment verifier accepts both top-level legacy metadata and the v1 `data` envelope.
- Add or retain integration coverage for:
  - public version response
  - invalid pagination, boolean, status, and season parameters
  - public missing and invalid slugs
  - admin authentication and CSRF failures
  - admin resource creation, update, deletion, and image operations
- Run the API test without requiring a network port by using temporary SQLite storage and Fastify injection.

Exit gate:

- v1 tests pass in CI.
- The dev deployment verifier succeeds against `/api/v1/version`.
- The release verifier remains green against `/api/version` until release migration is approved.

Rollback:

- Restore the previous deployment `VERSION_URL`.
- Keep the v1 routes deployed; no consumer needs to be reverted yet.

## Phase 2: Migrate Public Server-Rendered Pages

**Purpose:** move the first-party public pages to v1 while preserving rendered output and SEO behavior.

Tasks:

1. Update `getHomePage` in `src/modules/pages/pages.controller.js`:
   - inject `GET /api/v1/caravans?featured=true&limit=6`;
   - require a successful response;
   - parse the `data` array;
   - pass the array to the existing home template and SEO builder.
2. Update `getCatalogPage`:
   - inject `GET /api/v1/caravans`;
   - parse the `data` array;
   - preserve the existing catalogue template inputs.
3. Update `getCaravanPage`:
   - inject `GET /api/v1/caravans/:slug`;
   - preserve the existing 404 behavior for a v1 `404`;
   - parse and pass `data` to the template and SEO builder.
4. Add a small page API adapter/helper if repeated envelope and error handling would otherwise be duplicated. Keep the adapter local to the pages module unless another consumer needs it.
5. Do not make network calls from the browser; continue using same-server injection for these server-rendered pages.
6. Add page-level tests or Fastify injection tests that verify:
   - home renders featured records;
   - catalogue renders the v1 collection;
   - detail renders a v1 resource;
   - missing detail renders the existing 404 page;
   - malformed or failed API responses render existing fallback behavior.
7. Compare representative rendered HTML before and after migration for title, links, images, prices, and SEO metadata.

Exit gate:

- Public page smoke tests pass on `/`, `/caravans`, and `/caravans/:slug`.
- Rendered output has no unintended shape or SEO regressions.
- Public page error fallback behavior is unchanged.

Rollback:

- Revert only the page controller adapter changes to return to legacy internal routes.
- Keep v1 available for external consumers.

## Phase 3: Migrate Dev and Release Operational Consumers

**Purpose:** use one versioned metadata contract for deployment verification after it is proven in dev.

Tasks:

- Keep dev verification on `https://test.recomte.ru/api/v1/version`.
- Add production verification coverage against the v1 endpoint before changing release deployment.
- Change `VERSION_URL` in `.github/workflows/release-build.yml` only after:
  - the production deployment serves v1;
  - the verifier has passed against the production v1 envelope;
  - rollback to `/api/version` is documented and tested.
- Retain the verifier’s dual-shape support during the deprecation period.

Exit gate:

- Both dev and production deployment checks validate the commit from v1.
- Existing `/api/version` checks are no longer required by any deployment workflow.

## Phase 4: Migrate External and Administrative API Clients

**Purpose:** move consumers that depend on the HTTP API, independently of the server-rendered page migration.

Tasks:

- Identify clients through repository search, deployment configuration, access logs, and integration owners.
- For each client, update:
  - endpoint paths;
  - collection envelope parsing;
  - detail envelope parsing;
  - pagination handling;
  - structured error handling;
  - `PATCH /api/v1/images/:id` versus legacy image reorder semantics;
  - CSRF handling for administrative writes.
- Treat admin API migration as a separate consumer change. The built-in admin UI does not currently call the legacy admin API, so do not add unnecessary HTTP indirection to its direct service/controller flow.
- Provide a compatibility period where both legacy and v1 routes are monitored.

Exit gate:

- Each known client has a release using v1.
- Client error rates and response status distributions remain within agreed thresholds.
- No active client depends on legacy-only response shapes.

## Phase 5: Deprecate Legacy Routes

**Purpose:** remove compatibility burden only after adoption is measurable.

Tasks:

- Announce deprecation dates and migration guidance in `docs/api-v1.md` and release notes.
- Add deprecation headers or structured logging to legacy routes if operationally safe.
- Monitor legacy route usage and identify remaining callers.
- Keep a rollback window during which legacy routes can be restored quickly.
- Remove legacy routes only in a dedicated follow-up PR, not as part of the initial v1 introduction or consumer migration.
- Remove obsolete tests and documentation only after route removal is merged.

Exit gate:

- Zero known first-party consumers use legacy routes.
- External consumers have either migrated or accepted a documented sunset exception.
- Deployment and smoke checks use v1 exclusively.

## Testing Strategy

### Contract tests

Maintain tests for every v1 endpoint:

- `GET /api/v1/version`
- Public caravan collection filters, pagination, and envelopes
- Public detail success, invalid slug, hidden resource, and missing resource
- Admin list/detail authorization and resource errors
- Admin create/update/delete status codes and envelopes
- Image create/reorder/delete validation and missing-resource behavior
- Invalid and missing CSRF tokens for every write method

### Page integration tests

Test the rendered page routes rather than only the underlying API:

- `GET /`
- `GET /caravans`
- `GET /caravans/:slug`
- missing caravan detail
- API failure fallback behavior

Assertions should focus on user-visible output and SEO-critical fields, not incidental HTML formatting.

### Compatibility tests

While legacy routes remain:

- Compare representative legacy and v1 data for the same records.
- Verify hidden records remain excluded publicly.
- Verify image and feature hydration is equivalent.
- Verify application version and commit metadata are consistent across legacy and v1 version responses.

### CI and deployment tests

- Run unit/integration scripts with temporary databases and no fixed ports where possible.
- Keep network smoke tests for the deployed public and admin servers.
- Run deployment verification against the exact endpoint configured in each workflow.
- Test rollback by switching the verifier URL back to the legacy endpoint.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Page templates receive the wrong response shape | Add explicit adapters and page integration tests before switching routes |
| Home page returns too many or different featured caravans | Preserve `limit=6` and compare representative output |
| v1 hides or exposes different records | Test hidden status, status filters, and detail behavior |
| Deployment verifier rejects the v1 envelope | Support both response shapes and test both fixtures |
| Admin clients assume legacy image reorder paths | Document the v1 `PATCH` contract and migrate clients separately |
| Removing legacy routes breaks unknown clients | Monitor usage, announce deprecation, and remove in a separate PR |
| Internal pages become coupled to public HTTP contracts | Keep an adapter boundary and preserve same-server injection |

## Recommended PR Sequence

1. **V1 contract and infrastructure:** routes, validation, tests, documentation, and dual-shape deployment verifier.
2. **Public page migration:** switch the three server-rendered page consumers and add rendered-page regression tests.
3. **Release verification migration:** switch production deployment checks after dev proves stable.
4. **External/admin client migrations:** one consumer or integration per PR.
5. **Legacy deprecation and removal:** only after usage evidence and an agreed sunset window.
