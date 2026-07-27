# Suggestions Plan

## 0. add tailwind

## 1. Public Website Fixes

1. Consolidate layouts so public pages use one real SEO-capable header/base. `views/layouts/base.ejs` has richer meta tags, but active pages include `views/layouts/header.ejs`, which does not.
2. DONE? Add unique page metadata for home, catalogue, contact, and each caravan detail page: title, description, canonical URL, OpenGraph image, and structured data.
3. Replace placeholder contact details with real business contact paths: phone, WhatsApp/Telegram, email, Avito/profile links, and clear working hours.
4. Improve brand consistency: one typography scale, cleaner spacing, consistent buttons/cards, and a stronger first-screen message for Recomte.
5. Add trust-building content tailored to used imports: inspection checklist, repair/upgrade summary, import/delivery process, document support, payment/reservation terms, and "why buy from us".
6. Add a simple FAQ page or section answering common buyer questions about origin, condition, repairs, customs/documents, delivery in Russia, registration, towing weights, and viewing appointments.

## 2. Catalogue And Sales UX

1. Add catalogue filtering and sorting UI for fields already supported by the data model: status, season, beds, weight, year, price, country, and key features.
2. Add pagination or "load more" to the catalogue API and UI before the inventory grows.
3. Add prominent calls to action on caravan detail pages: call, message, request viewing, reserve, and ask a question about this caravan.
4. Add caravan-specific lead capture forms with source/UTM tracking so enquiries identify the exact caravan and marketing channel.
5. Add comparison mode for 2-3 caravans, focused on price, beds, weight, year, season, layout, and key equipment.
6. Add promotional badges such as "New arrival", "Winter ready", "Reduced price", "Reserved", and "Recently inspected".
7. Improve sold/reserved handling: keep sold units useful for SEO, but make available alternatives easy to find.
8. Add provenance blocks on caravan pages: country of purchase, condition at purchase, repair/upgrade summary, and included documents.

## 3. Admin Workflow

1. Add field-level validation messages on admin create/edit forms instead of one generic error banner.
2. Preserve submitted form values after validation errors so admins do not lose long edits.
3. Add an admin audit log showing who changed what and when, especially status, price, and deleted images.
4. Add soft-delete or archive support for caravans and images so content can be recovered after mistakes.
5. Add a lightweight content completeness indicator: missing price, low photo count, missing specs, no description, no contact-ready status.
6. Add image alt-text editing and automatic default alt text based on caravan title plus image order.
7. Add admin fields for refurbishment history and sales-ready notes so each listing can clearly show what was fixed, replaced, or upgraded.

## 4. Security And Reliability

1. Add stronger admin password policy and optional 2FA/TOTP for the admin account.
2. Harden file uploads further: verify image dimensions, pixel count, file size per image, total images per caravan, and safe filenames/paths.
3. Add versioned migrations and a schema version table instead of applying schema strings opportunistically.
4. Add backup and restore strategy for SQLite: scheduled snapshots, retention, restore instructions, and backup verification.
5. Add DB-level constraints/checks for core business rules such as allowed status values, non-negative price, sensible years, and valid weights.
6. Add structured logging and error monitoring for production incidents.

## 5. Engineering And Operations

1. Add a normal test command that runs all existing tests, then expand with focused route/integration coverage.
2. Add linting and formatting standards with pre-commit hooks.
3. Add CI checks for install, lint, tests, and Docker build.
4. Add smoke tests for the public pages to catch broken encoding, missing assets, and 500 responses.
5. Add accessibility checks for navigation, forms, image alt text, contrast, and keyboard flows.

## 6. Small Business Growth Ideas

1. Add testimonials or short buyer stories once the business has real customers.
2. Add "recently arrived" and "coming soon" inventory sections to make the site feel active.
3. Add a simple appointment request flow for viewing caravans in person.
4. Add analytics events for catalogue filters, detail-page contact clicks, phone clicks, and form submissions.
5. Add downloadable or printable caravan spec sheets for customers comparing options offline.
6. Add a homepage section explaining the buying process in 3-4 simple steps: sourcing in Europe, inspection/repair, delivery to Russia, and handoff to the buyer.
7. Add internal links between similar caravans to improve discovery and SEO.
8. Add a "Why imported used caravans" section that explains value, inspection standards, and what upgrades buyers can expect from your preparation process.
