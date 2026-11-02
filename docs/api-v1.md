# Versioned REST API

The versioned API is available under `/api/v1/`. Public and administrative endpoints are served by separate Fastify servers:

| Server | Default base URL | Endpoints |
| --- | --- | --- |
| Public | `http://localhost:3000` | Public catalogue and version endpoints |
| Admin | `http://localhost:3001` | Authenticated catalogue management endpoints |

The existing unversioned endpoints remain available for backward compatibility.

## Response format

Successful resource responses use a `data` property:

```json
{
  "data": {}
}
```

Collection responses include pagination metadata when pagination applies:

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0
  }
}
```

Application errors from the versioned route handlers use this shape:

```json
{
  "error": {
    "code": "CARAVAN_NOT_FOUND",
    "message": "Caravan not found"
  }
}
```

Authentication and CSRF middleware currently return the simpler compatibility shape `{ "error": "..." }` for `401` and `403` responses.

## Public API

Public endpoints do not require authentication and are served by the public server.

### Get API version

```http
GET /api/v1/version
```

Response:

```json
{
  "data": {
    "api_version": 1
  }
}
```

The response is sent with `Cache-Control: no-store`.

### List public caravans

```http
GET /api/v1/caravans
```

Supported query parameters:

| Parameter | Values | Default | Description |
| --- | --- | --- | --- |
| `limit` | Integer `1`-`100` | `50` | Number of results to return |
| `offset` | Integer `>= 0` | `0` | Number of results to skip |
| `featured` | `true`, `false` | None | Filter by featured status |
| `status` | `available`, `sold`, `reserved`, `hidden` | None | Filter by catalogue status; hidden caravans are never exposed publicly |
| `winter_rated` | `true`, `false` | None | `true` selects `all_season`; `false` selects other seasons |
| `camper_season` | `all_season`, `summer` | None | Filter by camper season |
| `feature_key` | String | None | Filter by a stored feature key |
| `feature_value` | String | None | Match the feature value when `feature_key` is provided |

Example:

```http
GET /api/v1/caravans?featured=true&camper_season=all_season&limit=20&offset=0
```

The collection is ordered by creation time, newest first. Each item includes the caravan fields plus hydrated `images`, `feature_map`, and feature-related fields.

Invalid pagination, boolean, status, or season values return `400` with code `INVALID_QUERY_PARAMETER`.

### Get a public caravan

```http
GET /api/v1/caravans/:slug
```

The slug may contain lowercase letters, numbers, hyphens, and underscores. Hidden or missing caravans return `404`:

```json
{
  "error": {
    "code": "CARAVAN_NOT_FOUND",
    "message": "Caravan not found"
  }
}
```

Invalid slug syntax returns `400` with code `INVALID_SLUG`.

## Admin API

Administrative endpoints are served by the admin server and require a valid authenticated admin session. Write requests also require a CSRF token in the `x-csrf-token` header or `_csrf` request field.

The examples below assume:

```text
Cookie: session=<authenticated-session>
x-csrf-token: <session-csrf-token>
Content-Type: application/json
```

Authentication failures return `401`. Missing or invalid CSRF tokens return `403`.

### List admin caravans

```http
GET /api/v1/caravans
```

Returns all caravans for administration, including hidden caravans:

```json
{
  "data": []
}
```

This administrative collection currently does not expose pagination or filtering parameters.

### Get an admin caravan

```http
GET /api/v1/caravans/:id
```

`id` must be a positive safe integer. A missing resource returns `404` with code `CARAVAN_NOT_FOUND`.

### Create a caravan

```http
POST /api/v1/caravans
```

The request must include `title`, `slug`, and `price`. A price of `0` is valid. Other caravan fields and feature fields use the same names as the administrative caravan model.

Example:

```json
{
  "title": "Example caravan",
  "slug": "example-caravan",
  "price": 25000,
  "status": "available",
  "camper_season": "summer"
}
```

A successful request returns `201` and the created resource in `data`. Invalid input returns `400` with code `VALIDATION_ERROR`; a duplicate unique value returns `409` with code `RESOURCE_CONFLICT`.

### Update a caravan

```http
PUT /api/v1/caravans/:id
```

The request uses the caravan model fields and returns the updated resource in `data`. The current implementation maps the request as a full administrative form payload, so clients should send the complete intended resource rather than treating `PUT` as a partial update.

A missing resource returns `404` with code `CARAVAN_NOT_FOUND`.

### Delete a caravan

```http
DELETE /api/v1/caravans/:id
```

A successful deletion returns `204` with an empty response body. The caravan's stored images are deleted with it. A missing resource returns `404` with code `CARAVAN_NOT_FOUND`.

### Add an image

```http
POST /api/v1/caravans/:id/images
```

This endpoint creates image metadata; it does not upload binary file content. The required `url` must be an HTTP(S) URL or a permitted relative path. Optional fields are `alt_text`, `sort_order`, `width`, and `height`.

Example:

```json
{
  "url": "/images/caravans/example.jpg",
  "alt_text": "Example caravan exterior",
  "sort_order": 0,
  "width": 1600,
  "height": 900
}
```

A successful request returns `201` and the created image in `data`.

### Reorder an image

```http
PATCH /api/v1/images/:id
```

Request body:

```json
{
  "sort_order": 1
}
```

`sort_order` must be an integer from `0` through `10000`. A successful request returns the updated image in `data`. Missing images return `404` with code `IMAGE_NOT_FOUND`.

### Delete an image

```http
DELETE /api/v1/images/:id
```

A successful deletion returns `204` with an empty response body. Missing images return `404` with code `IMAGE_NOT_FOUND`.

## Backward compatibility

The versioned API is additive. Existing public routes such as `/api/caravans` and existing administrative routes under `/admin/api/` remain available for existing clients.
