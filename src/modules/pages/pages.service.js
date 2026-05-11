const SITE_URL = 'https://recomte.ru';
const SITE_NAME = 'Recomte';
const DEFAULT_OG_IMAGE = `${SITE_URL}/public/images/top-image.jpg`;

const buildAbsoluteUrl = (pathname = '/') => `${SITE_URL}${pathname}`;

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
  const description = 'Б/у прицепы-дачи из Европы с осмотром, ремонтом и подготовкой к продаже в России.';
  const pathname = '/';

  return {
    title: 'Европейские б/у прицепы-дачи в России',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: caravans[0]?.images?.[0]?.url
      ? buildAbsoluteUrl(caravans[0].images[0].url)
      : DEFAULT_OG_IMAGE,
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: 'ru-RU'
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/public/images/favicon.svg`,
        email: 'info@recomte.ru'
      }
    ]
  };
};

export const buildCatalogueSeo = (caravans = []) => {
  const description = 'Просмотрите доступные б/у прицепы-дачи из Европы с фото, характеристиками и условиями подготовки для покупателей в России.';
  const pathname = '/caravans';

  return {
    title: 'Каталог прицепов-дач',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: caravans[0]?.images?.[0]?.url
      ? buildAbsoluteUrl(caravans[0].images[0].url)
      : DEFAULT_OG_IMAGE,
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
  const description = 'Свяжитесь с Recomte по вопросам прицепов-дач, просмотров, доставки и покупки в России.';
  const pathname = '/contact';

  return {
    title: 'Контакты',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: DEFAULT_OG_IMAGE,
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
        url: SITE_URL,
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
  const description = 'Политика конфиденциальности сайта recomte.ru.';
  const pathname = '/privacy';

  return {
    title: 'Политика конфиденциальности',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: DEFAULT_OG_IMAGE,
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
  const plainDescription = toPlainText(
    caravan.description,
    'Б/у прицеп-дача из Европы, подготовленная к продаже в России.'
  );
  const description = truncate(plainDescription, 160);
  const ogImage = caravan.images?.[0]?.url
    ? buildAbsoluteUrl(caravan.images[0].url)
    : DEFAULT_OG_IMAGE;

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
