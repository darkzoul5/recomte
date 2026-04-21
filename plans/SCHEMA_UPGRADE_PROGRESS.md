# Schema Upgrade Progress

## Phase 1 — High-Impact Core Additions ✅ COMPLETE

### Completed Changes

#### 🚗 Towing & Legal ✅

- ✅ `hitch_weight_kg INTEGER`
- ✅ `braked BOOLEAN`
- ✅ `stabilizer_present BOOLEAN`
- ✅ `recommended_tow_vehicle_min_kg INTEGER`
- ✅ `license_requirement TEXT`

#### 🛞 Chassis ✅

- ✅ `axles_count INTEGER` (replaces axle_type - kept for backwards compat)
- ✅ `brake_type TEXT`
- ✅ `suspension_type TEXT`
- ✅ `wheel_size_inch INTEGER`

#### 🔥 Gas System ✅

- ✅ `gas_system_present BOOLEAN`
- ✅ `gas_bottles_count INTEGER`

#### 🌡️ Climate & Ventilation ✅

- ✅ `has_ac BOOLEAN`
- ✅ `vent_fans_count INTEGER`
- ✅ `skylights_count INTEGER`

#### 🛏️ Layout ✅

- ✅ `shower_type TEXT` (replaces has_shower)
- ✅ `bed_layout TEXT`
- ✅ `windows_count INTEGER`
- ✅ `door_position TEXT`

#### 📄 Condition & History ✅

- ✅ `condition TEXT`
- ✅ `damp_detected BOOLEAN`
- ✅ `last_service_date DATE`
- ✅ `ownership_count INTEGER`

---

## Phase 2 — Clean Up Existing Schema ✅ COMPLETE

### Redundant Booleans Handling ✅

- ✅ Kept `cooktop_type TEXT` (replaces has_cooktop)
- ✅ Added `shower_type TEXT` (replaces has_shower)
- ✅ Kept `toilet_type TEXT` (replaces has_toilet)
- ✅ Kept `heating_type TEXT` (replaces has_heating)
- ✅ Kept `solar_wattage INTEGER` (replaces has_solar_panels)
- ✅ Legacy boolean fields kept for backwards compatibility

### Fields Moved to Features ✅

- ✅ `kitchen_outlets_count` → features JSON
- ✅ `heating_distribution` → features JSON
- ✅ `heater_brand` → features JSON
- ✅ `fuse_type` → (reserved for features)

### New Indexes (Phase 6) ✅

- ✅ `idx_caravans_max_weight_kg`
- ✅ `idx_caravans_beds_count`
- ✅ `idx_caravans_condition`

---

## Code Updates ✅

### db/schema.js ✅

- ✅ Updated CREATE TABLE with all Phase 1 fields
- ✅ Removed redundant boolean columns from schema definition
- ✅ Added new indexes for filtering

### db/db.js ✅

- ✅ Added migrations for existing databases (15 new columns)
- ✅ Updated `caravans.create()` destructuring with all Phase 1 fields
- ✅ Updated INSERT SQL statement with all Phase 1 columns
- ✅ Updated params array with proper type conversions
- ✅ Backwards-compatible with legacy fields

### src/utils/validation.js ✅

- ✅ Updated `ALLOWED_CARAVAN_COLUMNS` whitelist with all Phase 1 fields
- ✅ Maintained legacy fields for backwards compatibility
- ✅ Properly organized by section (sleeping, towing, gas, etc.)

### scripts/seed-db.js ✅

- ✅ Updated all 3 sample caravans with realistic Phase 1 data
- ✅ Added layout, gas, climate, condition, and chassis data
- ✅ Removed old `axle_type` fields, use new `axles_count`, `brake_type`, etc.

---

## ⏭️ Next Phases

### Phase 3 — Flexible Features Table (Optional)

- If needed: Create caravan_features table for truly dynamic attributes

### Phase 4 — Table Restructuring (Optional for scaling)

- If needed: Split into caravans, caravan_specs, caravan_condition tables

### Phase 5 — Business Logic (Next Priority)

- [ ] Add form validation for impossible states
- [ ] Add weight validation (empty < max)
- [ ] Implement derived field logic

### Phase 6 — Search & Filtering (Next Priority)

- [ ] Build filtering UI for all Phase 1 fields
- [ ] Support queries like "under 1200kg", "winter ready", "with AC"

### Phase 7 — Admin Form (Next Priority)

- [ ] Add Phase 1 fields to views/admin/edit.ejs
- [ ] Update forms to use new field names

---

## Testing Status

- [ ] Database initialization with new schema
- [ ] Existing database migration (backwards compatibility)
- [ ] Create caravan with new Phase 1 fields
- [ ] Edit caravan with new Phase 1 fields
- [ ] Sample data seeding with all 3 caravans
- [ ] Display Phase 1 fields on public caravan pages
- [ ] Admin form displays all Phase 1 fields

---

## Notes

- Legacy fields (has_cooktop, has_oven, etc.) are kept for backwards compatibility
- No data loss - all existing caravans will work
- New fields default to NULL for existing records
- Migration script runs automatically on next `npm start`
