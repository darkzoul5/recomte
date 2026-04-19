# 📋 UPGRADE PLAN - Recomte.ru Modern Rebuild

## Current State Assessment

### ✅ What You Have

- Static HTML/CSS site (Bulma) for European camper sales
- Proper Nginx config with security headers & HTTPS
- Dockerfile ready
- GitHub Actions / Gitea CI setup
- Basic pages: homepage, contacts, camper catalog

### ❌ What Needs Upgrading

- Hardcoded camper listings (currently placeholder pages)
- No admin panel to manage inventory
- No dynamic filtering/search
- Manual deployment process
- No database for historical/future inventory

---

## 🎯 PHASE 1: Core Backend (Weeks 1-2)

### 1.1 Data Model (SQLite)

```sql
-- trailers table
CREATE TABLE trailers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  year INTEGER,
  price INTEGER,
  status TEXT DEFAULT 'available', -- available/sold/reserved
  featured BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- images table
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trailer_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(trailer_id) REFERENCES trailers(id) ON DELETE CASCADE
);

-- inquiries table (for contact form submissions)
CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trailer_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- new/responded/closed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Node.js Backend Skeleton

```
project/
├── app.js                 (Fastify entry point)
├── db/
│   ├── schema.js         (migrations)
│   └── db.js             (connection)
├── src/
│   ├── routes/
│   │   ├── trailers.js   (GET /vehicles, /vehicle/:slug)
│   │   ├── admin.js      (admin routes)
│   │   └── contact.js    (form submissions)
│   ├── controllers/
│   │   └── trailers.js
│   └── middleware/
│       └── auth.js       (session/basic auth)
├── views/                (EJS templates)
│   ├── layouts/
│   │   └── base.ejs
│   ├── home.ejs
│   ├── trailer.ejs
│   ├── catalogue.ejs
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       └── edit-trailer.ejs
├── public/               (CSS, images, assets)
│   ├── css/
│   ├── images/
│   └── uploads/          (user uploaded images)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### 1.3 Tech Stack

- **Framework:** Fastify (faster, simpler than Express)
- **Database:** better-sqlite3 (sync, lightweight, production-ready)
- **Templates:** EJS (familiar, simple, no build step)
- **Session Management:** @fastify/session + @fastify/cookie
- **Authentication:** Basic session login (no JWT complexity)

---

## 🌐 PHASE 2: Core Pages Migration (Weeks 2-3)

### 2.1 Pages to Build (Server-Rendered)

| Page | Current | Future |
|------|---------|--------|
| **/** | Static HTML | Dynamic EJS - hero + featured trailers from DB |
| **/vehicles** | `/caravans/` | Dynamic catalogue, filterable by status/price |
| **/vehicle/:slug** | `/caravans/polar.html` | Dynamic detail page - data + images from DB |
| **/contact** | Static form | Form submission → `inquiries` table |
| **/admin/login** | None | Simple session login |
| **/admin/dashboard** | None | List all trailers, quick actions |
| **/admin/edit/:id** | None | Edit/delete/reorder images |

### 2.2 Asset Reuse

- Keep `bulma.css` (no need to rebuild UI framework)
- Migrate `style.css` as-is
- Move images from `/assets/` and `/caravans/assets/` to `/public/uploads/`
- No framework switching needed - just restructure into templates

---

## 🔐 PHASE 3: Admin Panel (Week 3)

### Minimal but Complete Admin

- `/admin/login` → POST session
- `/admin/` → dashboard list (trailers with status badges)
- `/admin/new` → create trailer form (title, description, year, price, status)
- `/admin/edit/:id` → edit form + image upload/reorder/delete
- Logout link

### Authentication

- Simple session cookie (no password manager needed)
- Hardcoded admin user in env variable or config file
- Protect all admin routes with `isAdmin` middleware

---

## 🐳 PHASE 4: Dockerization (Week 3)

### 4.1 Updated Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
```

### 4.2 Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - ./data:/app/data  # SQLite database
      - ./public/uploads:/app/public/uploads
    restart: unless-stopped

  traefik:
    image: traefik:v2.11
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml
      - ./letsencrypt:/letsencrypt
    restart: unless-stopped
```

---

## 🔁 PHASE 5: Webhook Deployment (Week 4)

### 5.1 Gitea Webhook Setup

1. Go to repo → Settings → Webhooks
2. Create webhook pointing to: `https://recomte.ru/deploy`
3. Secret token in env variable
4. Set to trigger on push events

### 5.2 Deploy Endpoint (Node.js)

```javascript
// POST /deploy (protected by secret header)
app.post('/deploy', (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }
  
  // Trigger: docker compose pull && docker compose up -d
  exec('docker compose pull && docker compose up -d', (err) => {
    res.json({ status: 'deploying' });
  });
});
```

### Benefits

- ✅ Push to repo → automatic live deploy
- ✅ Zero CPU polling (goodbye Watchtower)
- ✅ Deterministic updates
- ✅ No manual SSH needed

---

## ⚡ PHASE 6: Performance & Security (Week 4)

### Caching Headers (Traefik)

```yaml
static:
  resources:
    - name: assets
      path: /public/*
      headers:
        Cache-Control: "max-age=31536000, immutable"
```

### Image Optimization

- Compress on upload using `sharp` package
- Generate WebP + AVIF versions
- Lazy loading on product pages (`loading="lazy"`)

### Security Checklist

- ✅ SQLite file outside web root (`/data/`)
- ✅ Admin routes protected with session auth
- ✅ HTTPS everywhere (Let's Encrypt via Traefik)
- ✅ Secrets in `.env` (never in git)
- ✅ Input validation (trailer slug, image uploads)
- ✅ CSRF protection on forms
- ✅ No open Docker socket

---

## 📋 Recommended Implementation Order

### Week 1-2

- [ ] Backend skeleton (Fastify + better-sqlite3)
- [ ] SQLite schema & migrations
- [ ] Database connection layer

### Week 2-3

- [ ] Home page (dynamic, server-rendered)
- [ ] Catalogue page (/vehicles)
- [ ] Detail page (/vehicle/:slug)
- [ ] Contact form handler

### Week 3

- [ ] Admin login & session setup
- [ ] Admin dashboard (list trailers)
- [ ] Create/edit/delete trailer forms
- [ ] Image upload & management

### Week 3-4

- [ ] Docker Compose setup
- [ ] Traefik configuration
- [ ] HTTPS with Let's Encrypt

### Week 4

- [ ] Webhook deployment endpoint
- [ ] Image optimization pipeline
- [ ] Performance tuning
- [ ] Security hardening
- [ ] Testing & documentation

---

## 🎁 What Gets Built

| Feature | Benefit |
|---------|---------|
| Dynamic catalogue | Update inventory without editing HTML |
| Admin panel | Non-technical team can manage listings |
| Image uploads | Drag-drop images, auto-optimize |
| Webhook deploys | 0-downtime updates, no polling |
| Server-side rendering | Perfect for SEO + fast page loads |
| Single codebase | Everything in one repo = easy to maintain |
| Image gallery | Display multiple images per trailer |
| Contact form | Capture inquiries directly |
| Responsive design | Reuse Bulma CSS framework |

---

## 💾 Final Stack Summary

```
Recomte.ru (Modern Architecture)
├── Node.js + Fastify (lightweight, fast)
├── SQLite (file-based, easy backups)
├── EJS (server-rendered templates)
├── Docker + Docker Compose
├── Traefik (reverse proxy + HTTPS)
└── Webhook deployments (Gitea → Live)
```

### Design Philosophy

- ✔ **Simple:** Single monolith, no microservices
- ✔ **Fast:** Server-rendered, minimal JS
- ✔ **Secure:** Minimal attack surface
- ✔ **Maintainable:** Everything in one repo

---

## 🚀 Next Steps

1. **Ready to begin Phase 1?** (Backend skeleton + database)
2. **Generate full starter project** with all boilerplate code ready to run
3. **Start implementing features** one phase at a time

This is a **production-ready, lean, and maintainable** solution perfect for a small team managing camper inventory.
