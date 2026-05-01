# Robots.txt and Sitemap Configuration

## Overview

This document explains the SEO configuration for the campersite application with support for both **Google SEO** and **Yandex SEO** - the two major search engines for an international caravan platform serving the Russian and European markets.

**Quick Context:**

- **Google** - Global search dominance, essential for international visibility
- **Yandex** - Dominant in Russia, Eastern Europe, and Turkish markets (~60% search share in Russia)

Both search engines support XML sitemaps and robots.txt, but have different crawl patterns and optimization strategies.

## Files Created

### 1. **robots.txt** - `/public/robots.txt`

A comprehensive robots.txt file that:

- **Allows search engine crawling** of public-facing pages
- **Disallows crawling** of sensitive paths:
  - `/admin/` - Admin panel
  - `/api/` - API endpoints
  - `/healthcheck` - Health check endpoint
  - Configuration and private directories
- **Sets crawl delays** to be respectful to server resources
- **Blocks known aggressive bots** (MJ12bot, AhrefsBot, SemrushBot)
- **Provides special handling** for major search engines:
  - **Google (Googlebot)** - No crawl delay (wants aggressive indexing)
  - **Yandex (YandexBot)** - 0.5 second crawl delay with explicit path disallows
  - **Bing (Bingbot)** - 1 second crawl delay
- **References the sitemap** at `/sitemap.xml` (both Google and Yandex consume this)

### 2. **Sitemap Routes** - `/src/routes/sitemap.js`

A dynamic route handler that serves:

#### `/robots.txt`

- Serves the robots.txt file from the public directory
- 7-day cache for optimal performance

#### `/sitemap.xml`

- **Dynamic XML sitemap** containing:
  - Static pages: `/`, `/caravans`, `/contact`
  - All active caravans at `/caravans/:slug`
  - Last modification dates from caravan `updated_at` field
  - Change frequency and priority levels
  - **Image sitemap support** - includes primary caravan images
- 24-hour cache (86400 seconds)
- Automatic filtering of hidden caravans

#### `/sitemap-index.xml`

- Sitemap index for future scalability
- Ready to support multiple sitemaps when needed

### 3. **Integration** - Modified `/app.js`

The sitemap routes are registered in the main application, making them available immediately after deployment.

## Search Engine Optimization Benefits

### Static Pages (Priority hierarchy)

- **Home page** (`/`) - Priority: 1.0 (highest)
- **Catalogue** (`/caravans`) - Priority: 0.9
- **Contact** (`/contact`) - Priority: 0.7

### Dynamic Caravan Pages

- **Priority:** 0.8 (high visibility)
- **Change frequency:** Weekly (indicates regularly updated content)
- **Last modified dates:** Automatically pulled from database
- **Image indexing:** Each caravan can include primary image for image search results

## How It Works

### Sitemap Generation Flow

```
User/Search Engine → Request /sitemap.xml
                   ↓
         Query database for all active caravans
                   ↓
         Build XML with static pages + caravans
                   ↓
         Set 24-hour cache headers
                   ↓
         Return XML response
```

### Content Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://recomte.ru/caravans/caravan-slug</loc>
    <lastmod>2026-05-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://recomte.ru/path/to/image.jpg</image:loc>
      <image:title>Caravan Title</image:title>
    </image:image>
  </url>
</urlset>
```

## Configuration Details

### Robots.txt Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| `User-agent: *` | - | Applies to all robots |
| `Allow: /` | - | Allows crawling of public content |
| `Disallow: /admin/` | - | Protects admin panel |
| `Disallow: /api/` | - | Protects API endpoints |
| `Crawl-delay` | 1 second | Rate limiting for unknown bots |
| `Sitemap` | `/sitemap.xml` | Points to sitemap location |

### Googlebot & Bingbot & Yandex

These search engines get special treatment:

**Google (Googlebot)**

- **Crawl-delay:** 0 (wants aggressive crawling for fresh indexing)
- **Strategy:** Daily crawl for active content
- **Priority:** Highest for international reach

**Yandex (YandexBot)**

- **Crawl-delay:** 0.5 seconds (respectful rate)
- **Explicit disallows:** `/admin/`, `/api/`, `/healthcheck`
- **Strategy:** More conservative crawling, prefers structured data
- **Priority:** Highest for Russian market
- **Supports:** Image search, news indexing, clean-param

**Bing (Bingbot)**

- **Crawl-delay:** 1 second (reasonable rate)
- **Secondary priority** for this Russian-focused market

### Blocked User Agents

```
- MJ12bot (aggressive indexer)
- AhrefsBot (SEO tool bot)
- SemrushBot (SEO tool bot)
```

## Maintenance & Updates

### When to Update

1. **Add new static pages** - Update `/sitemap.xml` priority/changefreq in sitemap.js
2. **Change caravan visibility** - Automatically reflected via database status field
3. **Update robots.txt policy** - Edit `/public/robots.txt`
4. **Add new directories to disallow** - Edit `/public/robots.txt`

### Monitoring

Check these metrics regularly:

1. **Search Console** (Google Search Console):
   - Verify sitemaps are being read
   - Check coverage and errors
   - Monitor crawl statistics

2. **Bing Webmaster Tools**:
   - Submit robots.txt updates
   - Monitor indexing

3. **Application Logs**:
   - Monitor `/sitemap.xml` requests
   - Check cache hit rates

## Google SEO vs Yandex SEO - Setup Guide

Your site targets both international (Google) and Russian/Eastern European (Yandex) markets. Each has different requirements.

### Google SEO Setup

#### 1. **Google Search Console**

```
https://search.google.com/search-console
```

- Sign in with Google account
- Add property: `https://recomte.ru`
- Verify ownership via DNS record or HTML file upload
- Submit sitemap: `/sitemap.xml`

#### 2. **Google Structured Data**

Current implementation includes:

- ✅ Image sitemap (for Google Images)
- ✅ Mobile-friendly responsive design
- ✅ XML sitemap with lastmod dates
- ✅ Proper HTTP → HTTPS redirect
- ✅ robots.txt with sitemap reference

**Optional enhancements** (consider for future):

- Product structured data (Schema.org) for caravans
- LocalBusiness schema if you have physical locations
- AggregateOffer schema for pricing

#### 3. **Google Analytics**

- Install Google Analytics 4 (GA4)
- Track conversions (inquiry form submissions)
- Monitor user behavior for optimization

#### 4. **Google My Business** (if applicable)

- Create listing if you have physical locations
- Include business hours, contact info, images
- Respond to reviews

### Yandex SEO Setup

#### 1. **Yandex Webmaster** (Yandex Search Console)

```
https://webmaster.yandex.com
```

- Register account with email
- Add site: `https://recomte.ru`
- Verify ownership via:
  - DNS TXT record (recommended)
  - HTML file upload
  - Meta tag in HTML head
- Submit sitemap: `/sitemap.xml`

**Important:** Yandex requires explicit verification - robots.txt alone is not sufficient.

#### 2. **Yandex Metrica** (Analytics)

```
https://metrica.yandex.com
```

- Similar to Google Analytics but specific to Yandex
- Provides user behavior analytics
- Integrates with Yandex Search results
- Get tracking code and add to HTML head

#### 3. **Yandex-Specific robots.txt Settings**

Already implemented:

- ✅ Explicit `User-agent: Yandex` rules
- ✅ Appropriate crawl-delay (0.5 seconds)
- ✅ Path disallows match Google for consistency
- ✅ Clean-param support (optional, for UTM parameters)

#### 4. **Key Yandex Differences**

| Feature | Google | Yandex |
|---------|--------|--------|
| **Market Focus** | Global | Russia & East Europe |
| **Crawl Speed** | Aggressive | Conservative |
| **Preferred Update Frequency** | Daily | Weekly |
| **Image Search** | Yes | Yes (strong) |
| **Regional Targeting** | hreflang | Geo-targeting in settings |
| **Mobile-First Indexing** | Yes | Yes (introduced 2021) |
| **HTTPS Preference** | Strong | Strong |
| **Structured Data** | Rich Results, Knowledge Graph | Less emphasis |

### Side-by-Side Comparison

```
┌─────────────────────┬──────────────────┬──────────────────┐
│ Feature             │ Google           │ Yandex           │
├─────────────────────┼──────────────────┼──────────────────┤
│ Registration        │ Google Account   │ Yandex Account   │
│ Verification        │ DNS/HTML/Meta    │ DNS/HTML/Meta    │
│ Search Console      │ search.google    │ webmaster.yandex │
│ Analytics           │ Google Analytics │ Yandex Metrica   │
│ Sitemap Format      │ XML              │ XML (same)       │
│ robots.txt          │ Standard         │ Standard         │
│ Crawl Aggressiveness│ High             │ Medium           │
│ Update Frequency    │ Daily            │ Weekly           │
│ Language Support    │ 100+ languages   │ Russian-focused  │
│ Penalty System      │ Algorithm-based  │ Manual review    │
└─────────────────────┴──────────────────┴──────────────────┘
```

### Implementation Checklist

#### Pre-Launch

- [ ] Deploy robots.txt to `/public/robots.txt`
- [ ] Deploy sitemap to `/sitemap.xml`
- [ ] Verify HTTPS with valid SSL certificate
- [ ] Test robots.txt: `curl https://recomte.ru/robots.txt`
- [ ] Test sitemap: `curl https://recomte.ru/sitemap.xml`
- [ ] Validate sitemap XML: `xmllint --format https://recomte.ru/sitemap.xml`

#### Google Setup

- [ ] Register Google Search Console
- [ ] Verify site ownership
- [ ] Submit `/sitemap.xml`
- [ ] Submit `/sitemap-index.xml` (optional)
- [ ] Install Google Analytics 4
- [ ] Check robots.txt analysis in Search Console
- [ ] Review coverage and errors

#### Yandex Setup

- [ ] Register Yandex Webmaster
- [ ] Verify site ownership (DNS recommended)
- [ ] Submit `/sitemap.xml`
- [ ] Install Yandex Metrica
- [ ] Configure regional settings for Russia
- [ ] Check verification status in Webmaster
- [ ] Review crawl statistics

#### Post-Launch Monitoring

- [ ] Monitor indexing in both consoles (1-2 weeks)
- [ ] Check for crawl errors
- [ ] Verify sitemaps are being read
- [ ] Monitor search impressions and clicks
- [ ] Track user behavior in analytics
- [ ] Respond to any warnings or errors

### Performance Optimization Tips

**For Google:**

- Update caravan `updated_at` regularly (signals freshness)
- Create high-quality product descriptions
- Optimize images with alt text
- Build backlinks to improve authority

**For Yandex:**

- Use Russian language naturally in content
- Focus on user intent over keywords
- Update content regularly (weekly ideal)
- Include clear call-to-action
- Optimize for Russian user behavior

### Monitoring Tools

**Free Tools:**

- Google Search Console - indexing, crawl stats, search performance
- Yandex Webmaster - same for Yandex
- Yandex Metrica - analytics dashboard
- Google Analytics 4 - user behavior tracking
- `curl` and `xmllint` for local testing

**Premium Tools (Optional):**

- Semrush - competitor analysis, keyword research
- Ahrefs - backlink analysis, keyword research
- SE Ranking - local rank tracking

1. **Application Logs**:
   - Monitor `/sitemap.xml` requests
   - Check cache hit rates

## Best Practices

✅ **Keep robots.txt up-to-date** - As new routes are added

✅ **Review blocked bots annually** - Add new aggressive bots as needed

✅ **Monitor search console** - Ensure proper indexing

✅ **Test sitemap validity** - Use XML sitemap validators

✅ **Update caravan `updated_at` fields** - Ensures freshness signals to search engines

✅ **Use meaningful caravan slugs** - Improves SEO and user experience

## Testing the Implementation

### Test robots.txt

```bash
curl https://recomte.ru/robots.txt
```

### Test sitemap

```bash
curl https://recomte.ru/sitemap.xml
```

### Validate XML

```bash
curl https://recomte.ru/sitemap.xml | xmllint --format -
```

### Check with Search Console

1. Google Search Console → Coverage → Sitemap
2. Submit `/sitemap.xml`
3. Monitor status

## Future Enhancements

### Scalability (When >50,000 URLs)

If the sitemap grows beyond 50,000 URLs, split into multiple sitemaps:

```xml
<!-- /sitemap-index.xml -->
<sitemapindex>
  <sitemap>
    <loc>/sitemap-caravans-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>/sitemap-caravans-2.xml</loc>
  </sitemap>
</sitemapindex>
```

### Additional Sitemaps

Could add:

- News sitemap (for new caravan listings)
- Video sitemap (if video content added)
- Mobile sitemap (if different mobile experience)

## Security Considerations

✅ **robots.txt is public** - Doesn't provide security, only guidelines

✅ **Still protect sensitive paths** - With authentication middleware

✅ **API protection** - Relies on middleware, not robots.txt

⚠️ **Don't include sensitive information** - In robots.txt comments

## References

- [Robots.txt Specification](https://www.robotstxt.org/)
- [XML Sitemap Protocol](https://www.sitemaps.org/)
- [Google Search Central - Sitemaps](https://developers.google.com/search/docs/beginner/sitemaps)
- [Bing Webmaster Tools - Sitemaps](https://www.bing.com/webmasters/help/how-to-submit-sitemaps-82a15017)
