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

- ✅ `kitchen_outlets_count` → caravan_features table
- ✅ `heating_distribution` → caravan_features table
- ✅ `heater_brand` → caravan_features table
- ✅ `fuse_type` → (reserved for caravan_features)

### New Indexes (Phase 6) ✅

- ✅ `idx_caravans_max_weight_kg`
- ✅ `idx_caravans_beds_count`
- ✅ `idx_caravans_condition`

---

## Phase 2.5 — Features Table (NEWLY ADDED) ✅ COMPLETE

### New caravan_features Table ✅

- ✅ Normalized feature storage with `caravan_id`, `feature_key`, `feature_value`
- ✅ UNIQUE constraint on (caravan_id, feature_key) for integrity
- ✅ Indexes: `idx_features_caravan_id`, `idx_features_key_value`
- ✅ Full queryability: `SELECT * FROM caravans WHERE id IN (SELECT caravan_id FROM caravan_features WHERE feature_key='kitchen_outlets_count' AND feature_value > '5')`

### Features API in db.js ✅

- ✅ `features.getByCaravanId(caravanId)` - Get all features for caravan
- ✅ `features.getByKey(caravanId, featureKey)` - Get specific feature value
- ✅ `features.set(caravanId, featureKey, featureValue)` - Set/update feature
- ✅ `features.delete(caravanId, featureKey)` - Delete feature or all features

---

## Code Updates ✅

### db/schema.js ✅

- ✅ Updated CREATE TABLE with all Phase 1 fields
- ✅ Added caravan_features table with foreign key
- ✅ Added indexes for feature queries
- ✅ Features column removed from caravans table (now in separate table)

### db/db.js ✅

- ✅ Updated `caravans.create()` with all Phase 1 field destructuring
- ✅ Updated INSERT SQL statement with Phase 1 columns
- ✅ Updated params array with proper type conversions
- ✅ Features now inserted into caravan_features table (supports both object and array formats)
- ✅ Updated `caravans.update()` to handle features separately
- ✅ Features deletion on update, then re-insertion
- ✅ Added complete `features` query API (get, set, delete)
- ✅ Added `features.getByKeyValue(featureKey, featureValue)` for feature-based caravan queries
- ✅ Added feature input normalization for object/array/string payloads

### src/utils/validation.js ✅

- ✅ ALLOWED_CARAVAN_COLUMNS whitelist complete with all Phase 1 fields
- ✅ Maintained legacy fields for backwards compatibility
- ✅ Features field included for validation pass-through
- ✅ Added business logic validation (impossible states)
- ✅ Added weight validation (`weight_empty_kg < max_weight_kg`)
- ✅ Added towing/weight consistency validation
- ✅ Added derived field logic for `license_requirement`

### scripts/seed-db.js ✅

- ✅ Updated with Phase 1 data (if needed when data exists)

### admin-app.js ✅

- ✅ Form handlers (POST /admin/new, POST /admin/edit) use Phase 1 fields
- ✅ Features handled as normalized key/value map, passed to db layer
- ✅ Moved fields (`kitchen_outlets_count`, `heater_brand`, `heating_distribution`) persisted via caravan_features

### src/routes/admin.js ✅

- ✅ Admin API responses hydrate features from caravan_features table
- ✅ Edit form receives feature flags and moved field values from normalized features data

### src/routes/caravans.js ✅

- ✅ Public API hydrates features from caravan_features table
- ✅ Added feature-based query support via `feature_key` and optional `feature_value`

---

## ⏭️ Next Phases

### Phase 3 — Search & Filtering (Optional)

- [ ] Build filtering UI for all Phase 1 fields
- [ ] Support queries like "under 1200kg", "winter ready", "with AC"
- [x] Feature-based queries using caravan_features table (API layer complete)

### Phase 4 — Business Logic Validation (Next Priority)

- [x] Add form validation for impossible states
- [x] Add weight validation (empty < max)
- [x] Implement derived field logic
- [x] Validate towing vehicle weight vs caravan weight

### Phase 5 — Advanced Features (Future)

- [ ] Implement feature presets/templates
- [ ] Add audit trail for condition/history changes
- [ ] Seasonal pricing based on condition/features

---

## Testing Status

- ✅ Database initialization with new schema
- ✅ caravan_features table created and indexed
- ✅ Feature API working (getByCaravanId, set, delete)
- [x] Create caravan with Phase 1 fields and features
- [x] Edit caravan with Phase 1 fields and features
- [x] Query caravans by features
- [x] Display Phase 1 fields on public caravan pages

---

## Notes

- Legacy fields (has_cooktop, has_oven, etc.) are kept for backwards compatibility
- No data loss - all existing caravans will work
- New fields default to NULL for existing records
- Features now normalized in separate table for full queryability
- Feature values stored as TEXT but can be queried with range operators
- Migration script runs automatically on next `npm start`
- DB validator now requires `caravan_features` table
