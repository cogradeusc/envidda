# LENDAS API

A Spring Boot application with a static frontend for exploring oceanographic and environmental catalogs, checking temporal and spatial data availability, and serving controlled proxies to GeoServer.

## Hardening Status

- Reproducible builds through the Maven wrapper (`mvnw.cmd`)
- Java 21 enforced with Maven Enforcer
- Automated validation with `test`, `verify`, Checkstyle, and Spotless
- Frontend linting with ESLint
- Sensitive configuration externalized through environment variables and Spring profiles
- Unified GeoServer proxy for `WFS`, `WCS`, and `WMS`
- CORS and cache administration controlled through profiles and configuration

## Requirements

- Java 21
- Node.js 20+ for frontend linting
- PostgreSQL/PostGIS accessible from the application
- GeoServer accessible from the application

## Running Locally

### Backend

```powershell
./mvnw.cmd spring-boot:run
```

The application starts with the `dev` profile by default.

### Frontend Linting

```powershell
npm install
npm run lint
```

### Full Verification

```powershell
./mvnw.cmd test
./mvnw.cmd verify
```

## Configuration

### Main Environment Variables

```text
LENDAS_DATASOURCE_URL
LENDAS_DATASOURCE_USERNAME
LENDAS_DATASOURCE_PASSWORD
LENDAS_GEOSERVER_BASE_URL
LENDAS_GEOSERVER_WCS_URL
LENDAS_GEOSERVER_WMS_URL
LENDAS_ALLOWED_ORIGIN_PATTERNS
LENDAS_CACHE_PROCESS_TYPES_TTL
LENDAS_CACHE_PROCESS_TYPES_MAX
LENDAS_CACHE_VOCABULARIES_TTL
LENDAS_CACHE_VOCABULARIES_MAX
LENDAS_CACHE_DATA_TYPES_TTL
LENDAS_CACHE_DATA_TYPES_MAX
LENDAS_CACHE_FEATURE_TYPES_TTL
LENDAS_CACHE_FEATURE_TYPES_MAX
```

### Profiles

- `dev`
  - Provides useful defaults for local development
  - Opens CORS through `LENDAS_ALLOWED_ORIGIN_PATTERNS=*`
  - Enables cache administration
- `prod`
  - Requires GeoServer URLs to be provided through the environment
  - Disables cache administration
  - Restricts CORS through `LENDAS_ALLOWED_ORIGIN_PATTERNS`

## Main Endpoints

### Catalog

- `GET /api/catalog/process-types`
- `GET /api/catalog/data-type`
- `GET /api/catalog/feature-type`
- `GET /api/catalog/vocabulary`
- `GET /api/catalog/filter-process-types`
- `GET /api/catalog/filter-feature-of-interest`
- `GET /api/catalog/process-type`
- `GET /api/catalog/feature-of-interest`
- `GET /api/catalog/check-availability`

### GeoServer Proxy

- `GET /api/geoserver/wfs`
- `GET /api/geoserver/wcs`
- `GET /api/geoserver/wms`

## Public Parameter Convention

The API documents `kebab-case` as the canonical parameter format and keeps legacy aliases where applicable.

- `start-time`
- `end-time`
- `process-ids`
- `feature-ids`
- `spatial-filter`

## Examples

### Process Types

```bash
curl "http://localhost:8080/api/catalog/process-types?filter=sensor&lang=spa"
```

### Data Type

```bash
curl "http://localhost:8080/api/catalog/data-type?schema=ctd_intecmar&name=validation_flags_type"
```

### Feature Type

```bash
curl "http://localhost:8080/api/catalog/feature-type?schema=ctd_intecmar&name=ria"
```

### Vocabulary

```bash
curl "http://localhost:8080/api/catalog/vocabulary?schema=ccmm_global&name=cf_standard_names"
```

### Process Filter

```bash
curl "http://localhost:8080/api/catalog/filter-process-types?schema=ctd_intecmar&name=configuracion_ctd"
```

### Feature of Interest Filter

```bash
curl "http://localhost:8080/api/catalog/filter-feature-of-interest?schema=ctd_intecmar&name=estacion"
curl "http://localhost:8080/api/catalog/filter-feature-of-interest?schema=ctd_intecmar&name=estacion&spatial-filter=SRID=4326;POLYGON((-8.241291 43.35951, -8.234253 43.35951, -8.234253 43.364003, -8.241291 43.364003, -8.241291 43.35951))"
```

### Process Type Details

```bash
curl "http://localhost:8080/api/catalog/process-type?schema=ctd_intecmar&name=configuracion_ctd&id=1"
curl "http://localhost:8080/api/catalog/process-type?schema=ctd_intecmar&name=configuracion_ctd&id=1&start-time=2000-01-01T00:00:00"
```

### Availability

```bash
curl "http://localhost:8080/api/catalog/check-availability?schema=ctd_intecmar&name=configuracion_ctd&start-time=2000-01-01T00:00:00&end-time=2030-01-01T23:59:59"
```

### WMS Proxy

```bash
curl "http://localhost:8080/api/geoserver/wms?service=WMS&version=1.1.0&request=GetMap&layers=ccmm:layer_name&bbox=-9,42,-8,43&srs=EPSG:4326&width=512&height=512&format=image/png"
```

## Docker

### Build

```bash
docker build -t lendas_api .
```

### Run

```bash
docker run -d --name lendas_api -p 8080:8080 lendas_api
```

## Quality and Maintenance

- Frontend remote access is centralized in `ApiService` and `WfsClient`
- The service worker does not cache `/api/*` by default
- Backend caching is limited to stable metadata
- Tests cover critical utilities, WFS validation, and key controllers

## Known Follow-Up Work

- Reduce the complexity and size of some legacy scripts (`roms.js`, `wrf.js`, `process-type.js`, `app.js`)
- Replace scattered `console.*` calls with a frontend logger controlled by environment settings
- Continue extracting shared modules from the observational and WCS viewers
