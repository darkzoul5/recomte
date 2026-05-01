# Yandex & Google SEO Implementation Guide

**Last Updated:** May 1, 2026
**Target Markets:** Russia (Yandex), Global (Google)

## Quick Start

### 1. Verify Your Site Exists
```bash
# Check robots.txt is accessible
curl https://recomte.ru/robots.txt

# Check sitemap is accessible
curl https://recomte.ru/sitemap.xml

# Validate XML
curl https://recomte.ru/sitemap.xml | xmllint --format -
```

All should return 200 OK with proper content.

---

## Google Search Console Setup

### Step 1: Register at Google Search Console
1. Visit https://search.google.com/search-console
2. Sign in with your Google account
3. Click **"Add property"**

### Step 2: Add Your Domain
1. Select **"Domain"** tab
2. Enter: `recomte.ru`
3. Click **"Continue"**

### Step 3: Verify Ownership
Choose one method (DNS recommended):

#### Option A: DNS Record (Recommended)
```
TXT Record:
Name: recomte.ru
Value: google-site-verification=YOUR_VERIFICATION_CODE
```
- Go to your DNS provider
- Add the TXT record
- Wait 5-30 minutes for propagation
- Return to Search Console and click "Verify"

#### Option B: HTML File Upload
1. Download verification file
2. Place in `/public/` directory
3. Accessible at: `https://recomte.ru/[filename]`
4. Verify in Search Console

#### Option C: HTML Meta Tag
Add to `views/layouts/base.ejs` in `<head>`:
```html
<meta name="google-site-verification" content="YOUR_CODE">
```

### Step 4: Submit Sitemap
1. In Search Console left sidebar → **Sitemaps**
2. Enter: `https://recomte.ru/sitemap.xml`
3. Click **"Submit"**
4. Wait 1-2 weeks for indexing

### Step 5: Monitor Coverage
1. In Search Console left sidebar → **Coverage**
2. Check for errors and warnings
3. Excluded pages should show `/admin/`, `/api/`, etc.

### Step 6: Setup Robots.txt Analysis
1. In Search Console left sidebar → **Settings** → **Crawlers**
2. View current robots.txt
3. Test URLs you're concerned about

---

## Yandex Webmaster Setup

### Step 1: Register at Yandex Webmaster
1. Visit https://webmaster.yandex.com
2. Click **"Log in"**
3. Sign in with Yandex account (create if needed)
4. Click **"Add website"** or **"+ Add site"**

### Step 2: Add Your Site
1. Enter: `https://recomte.ru`
2. Click **"Add"**

### Step 3: Verify Ownership (DNS Recommended)

#### Option A: DNS TXT Record (Preferred by Yandex)
```
TXT Record:
Name: recomte.ru
Value: yandex-verification: YOUR_VERIFICATION_CODE
```
- Go to your DNS provider
- Add the TXT record
- Wait 5-30 minutes
- Return to Yandex Webmaster and click "Verify"

#### Option B: HTML Meta Tag
Add to `views/layouts/base.ejs` in `<head>`:
```html
<meta name="yandex-verification" content="YOUR_CODE">
```

#### Option C: HTML File Upload
1. Download verification file
2. Place in `/public/` directory
3. File will be accessible at domain root
4. Verify in Yandex

### Step 4: Submit Sitemap
1. In Yandex Webmaster left sidebar → **Sitemaps**
2. Enter: `https://recomte.ru/sitemap.xml`
3. Click **"Add"**
4. Wait for processing (usually instant)

### Step 5: Configure Site Settings
1. Go to **Settings** → **Site Settings**
2. **Region:** Select Russia (or target regions)
3. **Preferred Mirror:** `https://recomte.ru` (choose non-www)
4. **Phone/Email:** Add contact info
5. Save changes

### Step 6: Monitor Crawl Statistics
1. In Yandex Webmaster → **Indexing** → **Crawl Activity**
2. Should see regular crawls after verification
3. Check for blocked pages
4. Monitor click-through rates

### Step 7: Setup Yandex Metrica (Analytics)
1. Visit https://metrica.yandex.com
2. Click **"+ Create New Tag"**
3. Enter site info:
   - **Site Name:** Recomte
   - **Site URL:** `https://recomte.ru`
4. Get tracking code (looks like):
   ```javascript
   <!-- Yandex.Metrica counter -->
   <script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,
   k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrica/tag.js", "ym");
   ym(YOUR_ID, "init", {
       clickmap:true,
       trackLinks:true,
       accurateTrackBounce:true,
       webvisor:true
   });
   </script>
   <noscript><div><img src="https://mc.yandex.ru/watch/YOUR_ID" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
   <!-- /Yandex.Metrica counter -->
   ```
5. Add to `views/layouts/base.ejs` (at end of `<body>`)

---

## Updated HTML Head Tags Implementation

### Update `views/layouts/base.ejs`

The `<head>` section should include:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="<%= description || 'Recomte - Европейские прицепы-дачи...' %>">
  <meta name="robots" content="index, follow">
  
  <!-- Google Verification -->
  <meta name="google-site-verification" content="YOUR_GOOGLE_CODE">
  
  <!-- Yandex Verification -->
  <meta name="yandex-verification" content="YOUR_YANDEX_CODE">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://recomte.ru<%= currentPath || '/' %>">
  
  <!-- Language -->
  <link rel="alternate" hreflang="ru" href="https://recomte.ru<%= currentPath || '/' %>">
  
  <!-- ... stylesheets ... -->
</head>
```

---

## Timeline: What to Expect

### Week 1
- ✅ Robots.txt and sitemap accessible
- ✅ Both search engines verify site
- ⏳ Initial crawl begins (may be light)

### Week 2-3
- ⏳ Pages start appearing in search results
- ⏳ Google shows first crawl stats
- ⏳ Yandex processes initial sitemap

### Month 1-2
- ✅ Full coverage achieved (most pages indexed)
- ✅ Search traffic becomes visible in analytics
- ✅ Query impressions appear in both consoles

### Ongoing
- 📈 Ranking positions stabilize
- 📊 A/B test content improvements
- 🔄 Update caravan listings regularly for fresh signals

---

## Monitoring Dashboard

### Create a Monitoring Spreadsheet

Track these metrics weekly:

```
| Date | Google Indexed | Google Traffic | Yandex Indexed | Yandex Traffic | Errors |
|------|---|---|---|---|---|
| Week 1 | 5 pages | 0 | 2 pages | 0 | None |
| Week 2 | 50 pages | 5 clicks | 45 pages | 2 clicks | None |
| Week 3 | 120 pages | 25 clicks | 110 pages | 15 clicks | None |
```

### Check Points

**Daily/Weekly:**
- Monitor site errors (check logs)
- Verify robots.txt/sitemap accessibility
- Check crawl activity in both webmaster tools

**Monthly:**
- Review search console coverage
- Analyze search queries and CTR
- Update caravan listings for fresh signals

**Quarterly:**
- Audit internal links
- Check for broken links
- Review robots.txt for any needed updates

---

## Common Issues & Solutions

### Issue: Site Won't Verify

**Google:**
- Verify DNS record was added correctly
- Wait up to 30 minutes for propagation
- Try DNS lookup: `dig recomte.ru TXT`

**Yandex:**
- Ensure exact URL format: `https://recomte.ru` (no trailing slash)
- Try HTML file method if DNS fails
- Check file is in `/public/` directory

### Issue: Sitemap Not Being Read

**Solution:**
1. Check sitemap is valid XML: `xmllint --format https://recomte.ru/sitemap.xml`
2. Verify robots.txt references sitemap
3. Check sitemap.xml route returns 200 status
4. Manually submit in webmaster tools
5. Wait 24-48 hours for processing

### Issue: Pages Not Indexed

**Solution:**
1. Check coverage report for errors
2. Ensure pages aren't blocked by robots.txt
3. Verify page has no `noindex` meta tag
4. Check for redirect loops
5. Request indexing manually in Search Console
6. Update caravan `updated_at` for freshness signal

### Issue: Crawl Errors Reported

**Common causes:**
- 404 errors on linked pages
- Redirect loops (check .htaccess or nginx config)
- Timeouts (server too slow)
- SSL certificate issues

**Solutions:**
- Fix broken links
- Check redirect chain: `curl -L -i https://recomte.ru/url`
- Optimize server response time
- Ensure valid SSL certificate

---

## Advanced Optimization

### For Google
- Add JSON-LD Schema for products
- Create Google Business Profile
- Build quality backlinks
- Optimize Core Web Vitals (LCP, FID, CLS)

### For Yandex
- Use Russian language content naturally
- Focus on user experience
- Update content regularly
- Consider Yandex Advertising (Yandex.Direct)
- Submit structured data in Yandex format

### Both
- Optimize images with proper alt text
- Create mobile-friendly experience
- Fast page load times (<2s)
- Clear internal linking structure
- Regular content updates

---

## SEO Health Checklist

- [ ] robots.txt accessible and correct
- [ ] sitemap.xml accessible and valid
- [ ] SSL certificate valid (HTTPS)
- [ ] Google Search Console configured
- [ ] Yandex Webmaster configured
- [ ] Google Analytics 4 implemented
- [ ] Yandex Metrica implemented
- [ ] Verification meta tags added
- [ ] Canonical URLs correct
- [ ] Mobile responsive design confirmed
- [ ] No crawl errors reported
- [ ] sitemap being read (200+ pages indexed)
- [ ] Organic traffic visible in analytics
- [ ] Caravan `updated_at` fields populated
- [ ] Image alt text complete

---

## Support & Resources

**Google:**
- [Google Search Central Docs](https://developers.google.com/search/docs)
- [Search Console Help](https://support.google.com/webmasters)
- [Core Web Vitals Guide](https://web.dev/vitals/)

**Yandex:**
- [Yandex Webmaster Help](https://yandex.com/support/webmaster/)
- [Yandex SEO Guide](https://yandex.com/support/webmaster/diagnostics/overview.html)
- [Yandex Algorithm Guide](https://yandex.com/support/webmaster/search-guide/ranking.html)

**Tools:**
- XML Sitemap Validator: https://www.xml-sitemaps.com/validate-xml-sitemap.html
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- PageSpeed Insights: https://pagespeed.web.dev/

---

## Quick Reference Commands

```bash
# Test robots.txt
curl https://recomte.ru/robots.txt

# Test sitemap
curl https://recomte.ru/sitemap.xml

# Validate sitemap XML
curl https://recomte.ru/sitemap.xml | xmllint --format -

# Check HTTP headers
curl -i https://recomte.ru

# Check redirects
curl -L -i https://recomte.ru/caravans

# DNS verification check
dig recomte.ru TXT +short
```
