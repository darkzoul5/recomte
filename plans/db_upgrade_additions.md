# Caravan Marketplace Schema Improvement Plan

## Goal

Evolve the current schema into a **production-grade, scalable, and realistic caravan marketplace database**, while avoiding unnecessary complexity and minimizing unused fields.

---

## Phase 1 — High-Impact Core Additions (Do First)

### Objective

Add **critical missing specs** that directly affect buying decisions and search filtering.

### Schema Changes

#### 🚗 Towing & Legal

* `hitch_weight_kg INTEGER`
* `braked BOOLEAN`
* `stabilizer_present BOOLEAN`
* `recommended_tow_vehicle_min_kg INTEGER`
* `license_requirement TEXT`

#### 🛞 Chassis

* Replace:

  * `axle_type TEXT`
* With:

  * `axles_count INTEGER`
  * `brake_type TEXT`
  * `suspension_type TEXT`
  * `wheel_size_inch INTEGER`

#### 🔥 Gas System

* `gas_system_present BOOLEAN`
* `gas_bottles_count INTEGER`

#### 🌡️ Climate & Ventilation

* `has_ac BOOLEAN`
* `vent_fans_count INTEGER`
* `skylights_count INTEGER`

#### 🛏️ Layout

* `bed_layout TEXT`
* `windows_count INTEGER`
* `door_position TEXT`

#### 📄 Condition & History

* `condition TEXT`
* `damp_detected BOOLEAN`
* `last_service_date DATE`
* `ownership_count INTEGER`

---

## Phase 2 — Clean Up Existing Schema

### Objective

Reduce redundancy and improve data consistency.

### Remove Redundant Booleans

Replace patterns like:

* `has_cooktop BOOLEAN` + `cooktop_type TEXT`

With:

* Only `cooktop_type TEXT` if text exists cooktop exists

Apply same logic to:

* shower
* toilet
* heating
* solar

---

### Simplify Overly Granular Fields

Move these into flexible storage (`features` or separate table):

* `kitchen_outlets_count`
* `heating_distribution`
* `heater_brand`
* `fuse_type`

---

### Improve Naming Consistency

Standardize naming:

* use `_kg`, `_l`, `_mm`, `_ah`, `_w`
* avoid mixed naming styles

---

## Phase 3 — Improve Flexible Data Handling

### Objective

Handle rare or inconsistent specs without bloating schema.

### Replace

```
features TEXT
```

### With either

#### Option A (Recommended for SQLite simplicity)

New table:

```
caravan_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caravan_id INTEGER,
  key TEXT,
  value TEXT,
  FOREIGN KEY(caravan_id) REFERENCES caravans(id) ON DELETE CASCADE
)
```

#### Option B (If JSON supported well)

* Convert to real JSON column
* Enforce structure in application layer

---

## Phase 4 — Structural Refactor (Optional, Scalable)

### Objective

Prepare for scaling and cleaner logic separation.

### Split Tables

#### caravans (core listing)

* id, title, slug, price, status, etc.

#### caravan_specs

* all technical fields (dimensions, systems, etc.)

#### caravan_condition

* condition, damp, ownership, service history

#### caravan_features

* flexible attributes

---

## Phase 5 — Business Logic Improvements

### Objective

Align schema with real-world usage.

### Derived Logic (Do NOT store directly)

* `has_heating` → derived from `heating_type`
* `has_toilet` → derived from `toilet_type`
* `has_solar_panels` → derived from `solar_wattage > 0`

---

### Validation Rules

* Prevent impossible states:

  * `weight_empty_kg <= max_weight_kg`
  * `beds_count > 0`
  * `year > 1970`

---

### Defaults Strategy

Avoid excessive defaults like:

```
BOOLEAN DEFAULT 0
```

Instead:

* allow NULL
* interpret NULL as "unknown"

---

## Phase 6 — Search & Filtering Optimization

### Add Indexes

```
idx_caravans_price
idx_caravans_year
idx_caravans_max_weight_kg
idx_caravans_beds_count
idx_caravans_winter_rated
idx_caravans_condition
```

---

### Future Filtering Capabilities

Support queries like:

* “under 1200kg”
* “winter ready”
* “with AC”
* “towable with category B”

---

## Phase 7 — UX Alignment (Critical Insight)

### Ensure Schema Reflects User Questions

Users care about:

* Can my car tow it?
* Is it usable in winter?
* Is it in good condition?
* Is it comfortable?

---

### Avoid This Trap

Do NOT optimize for:

* “maximum number of fields”

Optimize for:

* **maximum usable data per listing**

---

## Summary

### Keep

* Core structured specs
* Dimensions, weights, systems

### Improve

* Towing, condition, real-world usability

### Avoid

* Overly specific rarely-used fields
* Redundant booleans
* bloated schema with empty values

---

## Next Steps

* switch to better-sqlite3 as db framework
* Design form UI based on schema
* Build filtering system aligned with fields
