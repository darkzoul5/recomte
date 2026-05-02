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

const buildHomeSeo = (caravans = []) => {
  const description = 'Used caravans from Europe with inspection, repair, and preparation for sale in Russia.';
  const pathname = '/';

  return {
    title: 'Used European Caravans in Russia',
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

const buildCatalogueSeo = (caravans = []) => {
  const description = 'Browse available used caravans from Europe with photos, specifications, and preparation details for buyers in Russia.';
  const pathname = '/caravans';

  return {
    title: 'Caravan Catalogue',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: caravans[0]?.images?.[0]?.url
      ? buildAbsoluteUrl(caravans[0].images[0].url)
      : DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${SITE_NAME} caravan catalogue`,
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

const buildContactSeo = () => {
  const description = 'Contact Recomte for caravan enquiries, viewings, delivery questions, and purchase support in Russia.';
  const pathname = '/contact';

  return {
    title: 'Contacts',
    description,
    canonicalUrl: buildAbsoluteUrl(pathname),
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `${SITE_NAME} contacts`,
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

const buildCaravanSeo = (caravan) => {
  const pathname = `/caravans/${caravan.slug}`;
  const plainDescription = toPlainText(
    caravan.description,
    'Used caravan from Europe prepared for sale in Russia.'
  );
  const description = truncate(plainDescription, 160);
  const ogImage = caravan.images?.[0]?.url
    ? buildAbsoluteUrl(caravan.images[0].url)
    : DEFAULT_OG_IMAGE;

  const additionalProperty = [
    caravan.year ? { '@type': 'PropertyValue', name: 'Year', value: caravan.year } : null,
    caravan.beds_count ? { '@type': 'PropertyValue', name: 'Beds', value: caravan.beds_count } : null,
    caravan.manufacturer_country
      ? { '@type': 'PropertyValue', name: 'Country of manufacture', value: caravan.manufacturer_country }
      : null,
    caravan.gross_weight_kg
      ? { '@type': 'PropertyValue', name: 'Gross weight (kg)', value: caravan.gross_weight_kg }
      : null,
    caravan.camper_season ? { '@type': 'PropertyValue', name: 'Season', value: caravan.camper_season } : null
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

export default async function publicPagesRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/featured-caravans'
      });
      const data = JSON.parse(response.body);
      const caravans = data.caravans || [];

      return reply.view('home', {
        title: 'Главная',
        caravans,
        seo: buildHomeSeo(caravans)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.view('home', {
        title: 'Главная',
        caravans: [],
        seo: buildHomeSeo([])
      });
    }
  });

  fastify.get('/caravans', async (request, reply) => {
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/caravans'
      });
      const data = JSON.parse(response.body);
      const caravans = data.caravans || [];

      return reply.view('catalogue', {
        title: 'Каталог',
        caravans,
        seo: buildCatalogueSeo(caravans)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.view('catalogue', {
        title: 'Каталог',
        caravans: [],
        seo: buildCatalogueSeo([])
      });
    }
  });

  fastify.get('/caravans/:slug', async (request, reply) => {
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/caravans/${request.params.slug}`
      });

      if (response.statusCode === 404) {
        return reply.code(404).view('404');
      }

      const caravan = JSON.parse(response.body);
      return reply.view('caravan', {
        title: caravan.title,
        caravan,
        seo: buildCaravanSeo(caravan)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Error loading caravan' });
    }
  });

  fastify.get('/contact', async (request, reply) => {
    return reply.view('contact', {
      title: 'Контакты',
      seo: buildContactSeo()
    });
  });
}
