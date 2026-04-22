export default async function publicPagesRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/featured-caravans'
      });
      const data = JSON.parse(response.body);
      return reply.view('home', { title: 'Главная', caravans: data.caravans || [] });
    } catch (error) {
      fastify.log.error(error);
      return reply.view('home', { title: 'Главная', caravans: [] });
    }
  });

  fastify.get('/caravans', async (request, reply) => {
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/caravans'
      });
      const data = JSON.parse(response.body);
      return reply.view('catalogue', { title: 'Каталог', caravans: data.caravans || [] });
    } catch (error) {
      fastify.log.error(error);
      return reply.view('catalogue', { title: 'Каталог', caravans: [] });
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
      return reply.view('caravan', { title: caravan.title, caravan });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Error loading caravan' });
    }
  });

  fastify.get('/contact', async (request, reply) => {
    return reply.view('contact', { title: 'Контакты' });
  });
}