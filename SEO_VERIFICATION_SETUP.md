# SEO Verification Setup Reference

**Site:** recomte.ru  
**Setup Date:** May 1, 2026  
**Status:** ⏳ Pending Configuration

---

## 1. Google Search Console

### Verification Codes

**Your Google Verification Code:**
```
YOUR_GOOGLE_CODE_HERE
```

**Where to add:**

#### Option A: DNS TXT Record (Recommended)
```
Provider: [Your DNS Provider Name]
Record Type: TXT
Name: recomte.ru
Value: google-site-verification=YOUR_GOOGLE_CODE
Status: ☐ Not Added  ☐ Pending  ☐ Verified
```

#### Option B: HTML Meta Tag
Add to `views/layouts/base.ejs` line 15:
```html
<meta name="google-site-verification" content="YOUR_GOOGLE_CODE">
```
Status: ☐ Not Added  ☐ Pending  ☐ Verified

#### Option C: HTML File
```
Filename: [verification file]
Location: /public/[filename]
URL: https://recomte.ru/[filename]
Status: ☐ Not Uploaded  ☐ Pending  ☐ Verified
```

### Google Search Console Setup Checklist
- [ ] Account created
- [ ] Site added to Search Console
- [ ] Ownership verified
- [ ] Verification code saved: ______________
- [ ] `/sitemap.xml` submitted
- [ ] Coverage report reviewed
- [ ] robots.txt analysis checked

---

## 2. Yandex Webmaster

### Verification Codes

**Your Yandex Verification Code:**
```
YOUR_YANDEX_CODE_HERE
```

**Where to add:**

#### Option A: DNS TXT Record (Recommended)
```
Provider: [Your DNS Provider Name]
Record Type: TXT
Name: recomte.ru
Value: yandex-verification: YOUR_YANDEX_CODE
Status: ☐ Not Added  ☐ Pending  ☐ Verified
```

#### Option B: HTML Meta Tag
Add to `views/layouts/base.ejs` line 18:
```html
<meta name="yandex-verification" content="YOUR_YANDEX_CODE">
```
Status: ☐ Not Added  ☐ Pending  ☐ Verified

#### Option C: HTML File
```
Filename: [verification file]
Location: /public/[filename]
URL: https://recomte.ru/[filename]
Status: ☐ Not Uploaded  ☐ Pending  ☐ Verified
```

### Yandex Webmaster Setup Checklist
- [ ] Account created
- [ ] Site added to Webmaster
- [ ] Ownership verified
- [ ] Verification code saved: ______________
- [ ] Region set to: Russia
- [ ] `/sitemap.xml` submitted
- [ ] Crawl activity checked

---

## 3. Yandex Metrica (Analytics)

**Your Yandex Metrica ID:**
```
YOUR_METRICA_ID_HERE
```

**Tracking Code:**
Add to end of `<body>` in `views/layouts/base.ejs`:
```html
<!-- Yandex.Metrica counter -->
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,
k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrica/tag.js", "ym");
ym(YOUR_METRICA_ID, "init", {
    clickmap:true,
    trackLinks:true,
    accurateTrackBounce:true,
    webvisor:true
});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/YOUR_METRICA_ID" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrica counter -->
```

Status: ☐ Not Added  ☐ Pending  ☐ Active

---

## 4. Google Analytics 4

**Your Google Analytics Tracking ID:**
```
YOUR_GA_ID_HERE
```

**Install via Google Tag Manager or add directly:**
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_ID');
</script>
```

Status: ☐ Not Added  ☐ Pending  ☐ Active

---

## 5. DNS Configuration Summary

| Record Type | Name | Value | Status |
|---|---|---|---|
| TXT | recomte.ru | google-site-verification=... | ☐ |
| TXT | recomte.ru | yandex-verification: ... | ☐ |

**DNS Provider:** ________________  
**DNS Admin Email:** ________________  
**Last Updated:** ________________

---

## Timeline

| Step | Due Date | Status | Notes |
|---|---|---|---|
| Create Google account | May 1 | ☐ | |
| Create Yandex account | May 1 | ☐ | |
| Add sites to consoles | May 2 | ☐ | |
| Add DNS records | May 2 | ☐ | Verify after 30 min |
| Verify in Google | May 2 | ☐ | |
| Verify in Yandex | May 2 | ☐ | |
| Submit sitemaps | May 3 | ☐ | |
| Install analytics | May 3 | ☐ | |
| First crawls observed | May 10 | ☐ | 1-2 week wait |
| Pages indexed | May 24 | ☐ | Initial indexing |
| Traffic appears | Jun 14 | ☐ | 2-6 weeks typical |

---

## Quick Action Items

### 🔴 Today - Get Verification Codes
1. Go to https://search.google.com/search-console
   - Add property: `recomte.ru`
   - Copy verification code
2. Go to https://webmaster.yandex.com
   - Add site: `https://recomte.ru`
   - Copy verification code

### 🟡 Tomorrow - Add to DNS/HTML
1. Choose verification method (DNS recommended)
2. Add TXT records to DNS provider
3. Wait 5-30 minutes for propagation
4. Verify in both consoles

### 🟢 This Week - Submit & Monitor
1. Submit sitemap in both consoles
2. Install Yandex Metrica
3. Install Google Analytics
4. Monitor console reports daily

---

## Testing Commands

```bash
# Verify DNS records added
dig recomte.ru TXT +short

# Test robots.txt
curl https://recomte.ru/robots.txt -I

# Test sitemap
curl https://recomte.ru/sitemap.xml -I

# Validate sitemap XML
curl https://recomte.ru/sitemap.xml | xmllint --format - > /dev/null && echo "Valid"
```

---

## Support Contacts

**Google Support:** https://support.google.com/webmasters  
**Yandex Support:** https://yandex.com/support/webmaster/

**DNS Provider:** ________________  
**DNS Provider Support:** ________________

---

## Notes

```
[Space for implementation notes, errors encountered, solutions applied]




```
