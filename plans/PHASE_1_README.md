# Phase 1: Backend Skeleton - README

## What's Been Created

Phase 1 includes a complete backend foundation with:

- ✅ **Fastify server** - Lightweight, fast Node.js framework
- ✅ **SQLite database** - File-based, production-ready
- ✅ **Complete schema** - All caravan fields + indexes
- ✅ **API routes** - Public & admin endpoints
- ✅ **Session auth** - Admin login protection
- ✅ **Database utilities** - Query helpers for all operations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Then edit `.env` and set:

- `ADMIN_PASSWORD` - Your admin login password
- `SESSION_SECRET` - Generate a random 32+ char string
- `WEBHOOK_SECRET` - For future Gitea webhook deployment

### 3. Initialize Database

```bash
npm run db:init
```

This creates the SQLite database with schema at `/data/app.db`

### 4. Seed Sample Data (Optional)

```bash
npm run db:seed
```

Adds 3 sample caravans for testing.

### 5. Start Server

```bash
npm start
```

Server runs on `http://localhost:3000`

## Available API Endpoints

### Public Endpoints (No Auth)

```
GET  /health                          # Server health check
GET  /api/caravans                    # List all available caravans
GET  /api/caravans?winter_rated=true  # Filter by winter rating
GET  /api/caravans/:slug              # Get single caravan by slug
GET  /api/featured-caravans           # Get featured caravans (homepage)
GET  /api/featured-caravans?limit=10  # Custom limit
```

### Admin Endpoints (Protected)

```
POST   /admin/login                         # Login (returns session cookie)
POST   /admin/logout                        # Logout

GET    /admin/api/caravans                  # List ALL caravans (including sold)
GET    /admin/api/caravans/:id              # Get caravan by ID for editing
POST   /admin/api/caravans                  # Create new caravan
PUT    /admin/api/caravans/:id              # Update caravan
DELETE /admin/api/caravans/:id              # Delete caravan

POST   /admin/api/caravans/:id/images       # Add image to caravan
DELETE /admin/api/images/:id                # Delete image
PUT    /admin/api/images/:id/reorder        # Reorder images
```

## Project Structure

```
.
├── app.js                     # Main Fastify server entry
├── package.json
├── .env.example
├── db/
│   ├── schema.js             # SQLite schema definition
│   └── db.js                 # Database connection & query helpers
├── src/
│   ├── routes/
│   │   ├── caravans.js       # Public caravan endpoints
│   │   └── admin.js          # Protected admin endpoints
│   └── middleware/
│       └── auth.js           # Session authentication
├── scripts/
│   ├── init-db.js            # Initialize database
│   └── seed-db.js            # Seed sample data
├── public/                   # Static files (CSS, images)
│   └── uploads/              # User uploaded images (created on first upload)
└── data/
    └── app.db                # SQLite database file (created on init)
```

## Testing the API

### Login (Get Session Cookie)

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}' \
  -c cookies.txt
```

### View Caravans

```bash
curl http://localhost:3000/api/caravans
```

### Create Caravan (Requires Auth)

```bash
curl -X POST http://localhost:3000/admin/api/caravans \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "My Caravan",
    "slug": "my-caravan",
    "description": "A great caravan",
    "year": 2024,
    "price": 50000,
    "status": "available",
    "beds_count": 4
  }'
```

## Database Schema Highlights

### Caravans Table (47 fields)

- Basic info: title, slug, description, year, price, status, featured
- Sleeping: beds_count, has_shower, has_toilet, toilet_type
- Water systems: fresh_water_tank_l, grey_water_tank_l, hot_water, etc.
- Kitchen: fridge type/volume, cooktop, oven, burners
- Heating: type, brand, source, distribution
- Comfort: insulation, double_glazed_windows, winter_rated
- Electrical: battery type/capacity, solar, inverter, 12V
- Dimensions: length, width, height, interior_height, weight, axle_type
- Features: JSON array (flexible, no schema migration needed)

### Images Table

- One-to-many relationship with caravans
- Supports up to 30 images per caravan
- Ordered by sort_order for gallery display

### Indexes for Performance

- `slug` - Fast single caravan lookup
- `status`, `featured`, `winter_rated` - Fast filtering
- `year`, `price` - Ready for future sorting
- `caravan_id`, `sort_order` - Efficient image gallery queries

## Development Notes

### Password-Protected Admin

- Admin password stored in `.env` as plain text (fine for small deployments)
- Session cookie expires after 24 hours
- All admin routes require valid session

### Database Format

- Boolean values stored as 0/1 in SQLite
- JSON features array stored as text, parsed on read
- All timestamps are DATETIME in UTC

### Next Phase (Phase 2)

- Server-rendered HTML pages (EJS templates)
- Homepage with featured caravans
- Caravan catalogue & detail pages
- Admin web forms (no API client needed)

## Troubleshooting

**"Database not initialized"**

```bash
npm run db:init
```

**Port already in use**

```bash
PORT=3001 npm start
```

**Permission denied on data/ folder**

```bash
mkdir -p data
chmod 755 data
```

**Admin login fails**
Check `.env` file has `ADMIN_PASSWORD` set correctly.

## Environment Variables

```
NODE_ENV          - 'production' or 'development'
PORT              - Server port (default: 3000)
HOST              - Server host (default: 0.0.0.0)
DB_PATH           - Database file path (default: /data/app.db)
ADMIN_PASSWORD    - Admin login password (required)
SESSION_SECRET    - Session cookie secret (min 32 chars)
WEBHOOK_SECRET    - Gitea webhook secret (for Phase 5)
```

## Production Readiness

✅ Database indexing for fast queries
✅ Session-based authentication
✅ Graceful shutdown handlers
✅ Better-sqlite3 for production stability
✅ WAL mode enabled for concurrent access
✅ Foreign key constraints enabled

Next: **Phase 2** - Server-rendered pages & templates
