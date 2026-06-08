const FALLBACK_SITE_URL = 'https://recomte.ru';

const normalizeSiteUrl = (value) => {
  if (typeof value !== 'string') {
    return FALLBACK_SITE_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  const normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

  try {
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/\/$/, '');
    return `${parsed.origin}${pathname}`;
  } catch {
    return FALLBACK_SITE_URL;
  }
};

export const getSiteUrl = () => normalizeSiteUrl(process.env.SITE_URL);

export const getSiteOrigin = () => new URL(getSiteUrl()).origin;

export const getSiteHost = () => new URL(getSiteUrl()).host;

export const getAdminUrl = () => normalizeSiteUrl(process.env.ADMIN_URL);

export const getAdminOrigin = () => new URL(getAdminUrl()).origin;
