# Suggestions Plan

Date: 2026-04-26
Project: campersite
Goal: Move the project from functional to professional production quality.

## 1. Critical Fixes (Do First)

1. DONE Fix corrupted public entry file in app.js.
2. DONE Remove insecure session fallback and replace in-memory session store for production.
3. DONE Add CSRF protection to all admin forms and sensitive POST endpoints.
4. DONE Add login brute-force protection and rate limiting for admin auth routes.
5. DONE Standardize status values across backend and UI (reserved vs pending mismatch).

## 2. Admin UI Improvements

1. DONE Split large admin-app.js into smaller modules (auth routes, page routes, upload service, CSRF and session).
2. Add field-level validation messages on admin edit/create forms.
3. DONE Add unsaved changes warning for long edit forms. add a button to hide/delist caravans on edit page
4. Add admin audit log (who changed what, when).

## 3. User UI Improvements

1. Improve branding consistency (typography, spacing, visual hierarchy, consistent component style).
2. Add SEO metadata per page (description, OpenGraph, canonical, structured data).
3. DONE Remove global noindex behavior from public pages in production.
4. Add trust-building sections (warranty, delivery, financing, inspection process).
5. Add catalogue filtering, sorting, and pagination UX.

## 4. Auth and Security Hardening

1. DONE Regenerate session after login and fully destroy on logout.
2. DONE Store numeric admin ID in session instead of username.
3. Add stronger password policy and optional 2FA support for admin.
4. Harden file upload validation (mime, extension, dimensions, limits, sanitization).

## 5. Database and Data Layer

1. Introduce versioned migrations and schema version tracking table.
2. Add backup and restore strategy (scheduled snapshots with retention policy).
3. Add soft-delete support for safer content operations.
4. Add pagination/query optimization paths for catalogue APIs.
5. Add DB-level constraints/checks for core business rules.

## 6. Engineering and Operations

1. Add automated tests (unit + route/integration).
2. Add linting and formatting standards with pre-commit hooks.
3. Add CI pipeline for lint, test, and build checks.
4. Add structured logging and error monitoring.
5. DONE Add env validation at startup and fail-fast on missing required variables.

## 7. High-Value New Features

1. Caravan-specific lead capture forms with UTM/source tracking.
2. Caravan comparison mode for side-by-side specs.
3. Reservation workflow with expiration and reminders.
4. Promotional badges.
