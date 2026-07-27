import { getSiteHost, getSiteUrl } from '../../utils/site-url.ts';

const SITE_NAME = 'Recomte';
const getDefaultOgImage = () => `${getSiteUrl()}/public/images/top-image.jpg`;

const buildAbsoluteUrl = (pathname = '/') => `${getSiteUrl()}${pathname}`;

const toPlainText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
};

const truncate = (value, maxLength = 160) => {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
};

const getAvailability = (status) => {
  if (status === 'sold') return 'https://schema.org/SoldOut';
  if (status === 'reserved') return 'https://schema.org/LimitedAvailability';
  return 'https://schema.org/InStock';
};

export const buildHomeSeo = (caravans = []) => {
  const siteUrl = getSiteUrl();
  const description = 'Купить б/у прицеп-дачи, караваны из Европы. прицеп-дачи и караваны с фото и характеристиками.';
  const pathname = '/';

  return {
    title: 'Европейские б/у прицепы-дачи в России',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: caravans[0]?.images?.[0]?.url
      ? buildAbsoluteUrl(caravans[0].images[0].url)
      : getDefaultOgImage(),
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: 'ru-RU'
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: siteUrl,
        logo: `${siteUrl}/public/images/favicon.svg`,
        email: 'info@recomte.ru'
      }
    ]
  };
};

export const buildCatalogueSeo = (caravans = []) => {
  const description = 'Каталог б/у прицепов-дач и караванов из Европы. Фото, характеристики, комплектация и цены.';
  const pathname = '/caravans';

  return {
    title: 'Каталог прицепов-дач',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: caravans[0]?.images?.[0]?.url
      ? buildAbsoluteUrl(caravans[0].images[0].url)
      : getDefaultOgImage(),
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${SITE_NAME} каталог прицепов-дач`, 
      url: buildAbsoluteUrl(pathname),
      description,
      inLanguage: 'ru-RU',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: caravans.length,
        itemListElement: caravans.slice(0, 12).map((caravan, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: buildAbsoluteUrl(`/caravans/${caravan.slug}`),
          name: caravan.title
        }))
      }
    }
  };
};

export const buildContactSeo = () => {
  const siteUrl = getSiteUrl();
  const description = 'Свяжитесь с нами по вопросам покупки, доставки и просмотра б/у прицепов-дач, караванов из Европы.';
  const pathname = '/contact';

  return {
    title: 'Контакты',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: getDefaultOgImage(),
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `${SITE_NAME} контакты`,
        url: buildAbsoluteUrl(pathname),
        description,
        inLanguage: 'ru-RU'
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: siteUrl,
        email: 'info@recomte.ru',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: 'info@recomte.ru',
          availableLanguage: ['ru']
        }
      }
    ]
  };
};

export const buildPrivacySeo = () => {
  const description = `Информация о конфиденциальности и защите персональных данных пользователей ${getSiteHost()}.`;
  const pathname = '/privacy';

  return {
    title: 'Политика конфиденциальности',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: getDefaultOgImage(),
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Политика конфиденциальности',
      url: buildAbsoluteUrl(pathname),
      description,
      inLanguage: 'ru-RU'
    }
  };
};

export const buildCaravanSeo = (caravan) => {
  const pathname = `/caravans/${caravan.slug}`;
  const defaultOgImage = getDefaultOgImage();
  const plainDescription = toPlainText(
    caravan.description,
    'Б/у прицеп-дача из Европы, в России.'
  );
  const description = truncate(plainDescription, 160);
  const ogImage = caravan.images?.[0]?.url
    ? buildAbsoluteUrl(caravan.images[0].url)
    : defaultOgImage;

  const seasonLabel = caravan.camper_season === 'all_season' ? 'Всесезонный' : (caravan.camper_season === 'summer' ? 'Лето' : undefined);
  const additionalProperty = [
    caravan.year ? { '@type': 'PropertyValue', name: 'Год', value: caravan.year } : null,
    caravan.beds_count ? { '@type': 'PropertyValue', name: 'Спальные места', value: caravan.beds_count } : null,
    caravan.manufacturer_country
      ? { '@type': 'PropertyValue', name: 'Страна производства', value: caravan.manufacturer_country }
      : null,
    caravan.gross_weight_kg
      ? { '@type': 'PropertyValue', name: 'Вес брутто (кг)', value: caravan.gross_weight_kg } : null,
    seasonLabel ? { '@type': 'PropertyValue', name: 'Сезон', value: seasonLabel } : null
  ].filter(Boolean);

  return {
    title: caravan.title,
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: caravan.title,
      description,
      url: buildAbsoluteUrl(pathname),
      image: (caravan.images || []).map((image) => buildAbsoluteUrl(image.url)),
      sku: caravan.slug,
      brand: {
        '@type': 'Brand',
        name: SITE_NAME
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'RUB',
        price: caravan.price,
        availability: getAvailability(caravan.status),
        url: buildAbsoluteUrl(pathname),
        itemCondition: 'https://schema.org/UsedCondition'
      },
      additionalProperty
    }
  };
};
