import { buildHomeSeo, buildCatalogueSeo, buildContactSeo, buildCaravanSeo, buildPrivacySeo } from './pages.service.js';

export const getHomePage = async (request, reply) => {
  try {
    const response = await request.server.inject({
      method: 'GET',
      url: '/api/featured-caravans'
    });
    const data = JSON.parse(response.body);
    const caravans = data.caravans || [];

    return reply.view('pages/home/index', {
      title: 'Главная',
      caravans,
      seo: buildHomeSeo(caravans)
    });
  } catch (error) {
    request.log.error({ err: error }, 'Failed to load home page');
    return reply.view('pages/home/index', {
      title: 'Главная',
      caravans: [],
      seo: buildHomeSeo([])
    });
  }
};

export const getCatalogPage = async (request, reply) => {
  try {
    const response = await request.server.inject({
      method: 'GET',
      url: '/api/caravans'
    });
    const data = JSON.parse(response.body);
    const caravans = data.caravans || [];

    return reply.view('pages/catalog/index', {
      title: 'Каталог прицепов-дач',
      caravans,
      seo: buildCatalogueSeo(caravans)
    });
  } catch (error) {
    request.log.error({ err: error }, 'Failed to load catalog page');
    return reply.view('pages/catalog/index', {
      title: 'Каталог прицепов-дач',
      caravans: [],
      seo: buildCatalogueSeo([])
    });
  }
};

export const getCaravanPage = async (request, reply) => {
  try {
    const response = await request.server.inject({
      method: 'GET',
      url: `/api/caravans/${request.params.slug}`
    });

    if (response.statusCode === 404) {
      return reply.code(404).view('pages/errors/404');
    }

    const caravan = JSON.parse(response.body);
    return reply.view('pages/catalog/caravan', {
      caravan,
      seo: buildCaravanSeo(caravan)
    });
  } catch (error) {
    request.log.error({ err: error }, 'Failed to load caravan page');
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
};

export const getContactPage = async (request, reply) => {
  return reply.view('pages/contact/index', {
    title: 'Контакты',
    seo: buildContactSeo()
  });
};

export const getPrivacyPage = async (request, reply) => {
  return reply.view('pages/privacy/index', {
    title: 'Политика конфиденциальности',
    seo: buildPrivacySeo()
  });
};
