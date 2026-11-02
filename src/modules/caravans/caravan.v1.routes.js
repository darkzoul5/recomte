import { validateSlug, validateStatus } from '../../utils/validation.js';
import {
  getAllCaravans,
  getCaravanBySlug,
  hydrateCaravan,
  searchCaravansByFeature
} from './caravan.service.js';

const sendError = (reply, statusCode, code, message) => reply.code(statusCode).send({
  error: { code, message }
});

const parseIntegerQuery = (value, fallback, min, max, name) => {
  if (value === undefined) return fallback;
  if (!/^-?\d+$/.test(String(value))) {
    throw new Error(`${name} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
};

const parseBooleanQuery = (value, name) => {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
};

export const registerCaravanV1Routes = async (fastify) => {
  fastify.get('/api/v1/version', { logLevel: 'silent' }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { data: { api_version: 1 } };
  });

  fastify.get('/api/v1/caravans', async (request, reply) => {
    try {
      const limit = parseIntegerQuery(request.query.limit, 50, 1, 100, 'limit');
      const offset = parseIntegerQuery(request.query.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
      const featured = parseBooleanQuery(request.query.featured, 'featured');
      const winterRated = parseBooleanQuery(request.query.winter_rated, 'winter_rated');
      const { status, camper_season: camperSeason, feature_key: featureKey } = request.query;

      if (status !== undefined && !validateStatus(status)) {
        throw new Error('status must be a supported status');
      }
      if (camperSeason !== undefined && !['all_season', 'summer'].includes(camperSeason)) {
        throw new Error('camper_season must be all_season or summer');
      }

      let caravans = featureKey
        ? searchCaravansByFeature(String(featureKey).trim(), request.query.feature_value === undefined ? null : String(request.query.feature_value))
        : getAllCaravans();

      if (status !== undefined) caravans = caravans.filter((caravan) => caravan.status === status);
      if (featured !== undefined) caravans = caravans.filter((caravan) => Boolean(caravan.featured) === featured);
      if (winterRated === true) caravans = caravans.filter((caravan) => caravan.camper_season === 'all_season');
      if (winterRated === false) caravans = caravans.filter((caravan) => caravan.camper_season !== 'all_season');
      if (camperSeason !== undefined) caravans = caravans.filter((caravan) => caravan.camper_season === camperSeason);

      const total = caravans.length;
      const data = caravans.slice(offset, offset + limit).map(hydrateCaravan);

      return { data, pagination: { limit, offset, total } };
    } catch (error) {
      if (error.message.includes('must be')) {
        return sendError(reply, 400, 'INVALID_QUERY_PARAMETER', error.message);
      }
      request.log.error({ err: error }, 'Failed to fetch caravans');
      return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch caravans');
    }
  });

  fastify.get('/api/v1/caravans/:slug', async (request, reply) => {
    try {
      const { slug } = request.params;
      if (!validateSlug(slug)) {
        return sendError(reply, 400, 'INVALID_SLUG', 'The caravan slug is invalid');
      }

      const caravan = getCaravanBySlug(slug);
      if (!caravan) {
        return sendError(reply, 404, 'CARAVAN_NOT_FOUND', 'Caravan not found');
      }

      return { data: hydrateCaravan(caravan) };
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch caravan');
      return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch caravan');
    }
  });
}
