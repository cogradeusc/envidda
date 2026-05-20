package org.example.lendas.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.lendas.config.GeoserverProperties;
import org.example.lendas.util.StringUtils;
import org.example.lendas.wfs.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Objects;

import static org.example.lendas.wfs.WfsConstants.*;

/**
 * Servicio para proxy de peticiones a GeoServer.
 * <p>
 * Proporciona métodos para:
 * <ul>
 *     <li>Proxy de peticiones WFS (Web Feature Service)</li>
 *     <li>Proxy de peticiones WCS (Web Coverage Service)</li>
 *     <li>Construcción de URIs para GeoServer</li>
 *     <li>Manejo de respuestas y errores</li>
 * </ul>
 * <p>
 * Sigue el principio de Single Responsibility - el controller solo maneja HTTP,
 * este servicio maneja la lógica de proxy.
 */
@Service
public class GeoserverProxyService {

    private static final Logger log = LoggerFactory.getLogger(GeoserverProxyService.class);

    private final RestTemplate restTemplate;
    private final String geoserverBaseUrl;
    private final String geoserverWcsUrl;
    private final String geoserverWmsUrl;

    public GeoserverProxyService(RestTemplate restTemplate, GeoserverProperties geoserverProperties) {
        this.restTemplate = restTemplate;
        this.geoserverBaseUrl = Objects.requireNonNull(geoserverProperties.baseUrl(), "GeoServer base URL is required");
        this.geoserverWcsUrl = Objects.requireNonNull(geoserverProperties.wcsUrl(), "GeoServer WCS URL is required");
        this.geoserverWmsUrl = Objects.requireNonNull(geoserverProperties.wmsUrl(), "GeoServer WMS URL is required");
    }

    /**
     * Ejecuta una petición WFS a GeoServer.
     *
     * @param request la petición WFS configurada
     * @return respuesta JSON de GeoServer
     * @throws GeoserverException si ocurre un error de comunicación
     * @throws org.example.lendas.exception.ValidationException si la petición es inválida
     */
    @SuppressWarnings("null") // Spring @NonNull en RestTemplate.exchange()
    public ResponseEntity<String> executeWfsRequest(WfsRequest request) {
        log.debug("Ejecutando petición WFS: {}", request);

        // Validar la petición
        WfsRequestValidator.validate(request);

        try {
            URI uri = buildWfsUri(request);
            log.debug("URI WFS construida: {}", uri);

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            return validateAndReturnJsonResponse(response);

        } catch (ResourceAccessException e) {
            log.error("No se puede conectar a GeoServer WFS: {}", geoserverBaseUrl, e);
            throw GeoserverException.connectionError(SERVICE_NAME_WFS, geoserverBaseUrl, e);
        } catch (RestClientException e) {
            log.error("Error en comunicación con GeoServer WFS", e);
            throw GeoserverException.communicationError(SERVICE_NAME_WFS, REQUEST_GET_FEATURE, e);
        }
    }

    /**
     * Ejecuta una petición WCS a GeoServer.
     *
     * @param servletRequest el request HTTP original
     * @param bbox bounding box opcional
     * @return respuesta de GeoServer (binaria o XML)
     * @throws GeoserverException si ocurre un error de comunicación
     */
    @SuppressWarnings("null") // Spring @NonNull en RestTemplate.exchange()
    public ResponseEntity<byte[]> executeWcsRequest(HttpServletRequest servletRequest, String bbox) {
        String requestType = servletRequest.getParameter(PARAM_REQUEST);
        String coverageId = servletRequest.getParameter(PARAM_COVERAGE_ID);

        logAllParameters(servletRequest);
        log.debug("Ejecutando petición WCS - request: {}, coverageId: {}, bbox: {}",
                requestType, coverageId, bbox);

        try {
            URI uri = buildWcsUri(servletRequest, bbox);
            log.info("URI WCS construida: {}", uri);

            HttpHeaders headers = new HttpHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    entity,
                    byte[].class
            );

            return processWcsResponse(response, requestType);

        } catch (ResourceAccessException e) {
            log.error("No se puede conectar a GeoServer WCS: {}", geoserverWcsUrl, e);
            throw GeoserverException.connectionError(SERVICE_NAME_WCS, geoserverWcsUrl, e);
        } catch (RestClientException e) {
            log.error("Error en comunicación con GeoServer WCS", e);
            throw GeoserverException.communicationError(SERVICE_NAME_WCS, requestType, e);
        }
    }

    @SuppressWarnings("null")
    public ResponseEntity<byte[]> executeWmsRequest(HttpServletRequest servletRequest) {
        try {
            URI uri = buildProxyUri(servletRequest, geoserverWmsUrl);
            ResponseEntity<byte[]> response = restTemplate.exchange(uri, HttpMethod.GET, HttpEntity.EMPTY, byte[].class);
            return ResponseEntity.status(response.getStatusCode())
                    .headers(filterBinaryHeaders(response.getHeaders()))
                    .body(response.getBody());
        } catch (ResourceAccessException e) {
            log.error("No se puede conectar a GeoServer WMS: {}", geoserverWmsUrl, e);
            throw GeoserverException.connectionError("GeoServer WMS", geoserverWmsUrl, e);
        } catch (RestClientException e) {
            log.error("Error en comunicación con GeoServer WMS", e);
            throw GeoserverException.communicationError("GeoServer WMS", "GetMap", e);
        }
    }

    /**
     * Construye la URI para una petición WFS.
     */
    @SuppressWarnings("null") // Spring @NonNull en UriComponentsBuilder/UriUtils
    private URI buildWfsUri(WfsRequest request) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(geoserverBaseUrl)
                .queryParam(PARAM_SERVICE, SERVICE_WFS)
                .queryParam(PARAM_VERSION, VERSION_1_0_0)
                .queryParam(PARAM_REQUEST, REQUEST_GET_FEATURE)
                .queryParam(PARAM_OUTPUT_FORMAT, OUTPUT_FORMAT_JSON);

        // typeName (con valor por defecto)
        builder.queryParam(PARAM_TYPENAME, request.getTypeName());

        // cql_filter opcional
        request.getCqlFilter().ifPresent(filter -> {
            String encodedFilter = UriUtils.encode(filter, StandardCharsets.UTF_8);
            builder.queryParam(PARAM_CQL_FILTER, encodedFilter);
        });

        // bbox opcional
        request.getBbox().ifPresent(bbox ->
                builder.queryParam(PARAM_BBOX, bbox));

        // maxFeatures opcional
        request.getMaxFeatures().ifPresent(maxFeatures ->
                builder.queryParam(PARAM_MAX_FEATURES, maxFeatures));

        UriComponents uriComponents = builder.build(true);
        return uriComponents.toUri();
    }

    /**
     * Construye la URI para una petición WCS usando UriComponentsBuilder.
     */
    @SuppressWarnings("null") // Spring @NonNull en UriComponentsBuilder
    private URI buildWcsUri(HttpServletRequest request, String bbox) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(geoserverWcsUrl);

        // Copiar todos los parámetros de la petición original (excepto bbox)
        Enumeration<String> paramNames = request.getParameterNames();
        while (paramNames.hasMoreElements()) {
            String paramName = paramNames.nextElement();

            if (PARAM_BBOX.equals(paramName)) {
                continue;
            }

            String[] paramValues = request.getParameterValues(paramName);
            if (paramValues != null) {
                for (String paramValue : paramValues) {
                    if (paramValue != null) {
                        builder.queryParam(paramName, paramValue);
                    }
                }
            }
        }

        // Asegurar que service=WCS está presente
        if (StringUtils.isBlank(request.getParameter(PARAM_SERVICE))) {
            builder.queryParam(PARAM_SERVICE, SERVICE_WCS);
        }

        // Si hay BBOX, agregar los parámetros subset de WCS 2.0.1
        if (StringUtils.isNotBlank(bbox)) {
            appendBboxSubsets(builder, bbox);
        }

        URI uri = builder.build().toUri();
        log.info("URI WCS construida: {}", uri);
        return uri;
    }

    private URI buildProxyUri(HttpServletRequest request, String baseUrl) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(
                Objects.requireNonNull(baseUrl, "Proxy base URL cannot be null"));
        Enumeration<String> paramNames = request.getParameterNames();
        while (paramNames.hasMoreElements()) {
            String paramName = paramNames.nextElement();
            if (paramName == null) {
                continue;
            }
            String[] paramValues = request.getParameterValues(paramName);
            if (paramValues == null) {
                continue;
            }
            for (String paramValue : paramValues) {
                if (paramValue != null) {
                    builder.queryParam(paramName, paramValue);
                }
            }
        }
        return builder.build().toUri();
    }

    /**
     * Agrega parámetros subset de WCS 2.0.1 al UriComponentsBuilder.
     */
    private void appendBboxSubsets(UriComponentsBuilder builder, String bbox) {
        try {
            String[] parts = bbox.split(BBOX_SEPARATOR);
            if (parts.length != BBOX_COORDINATE_COUNT) {
                log.warn("Formato de BBOX inválido: '{}'. Se esperaba 'minLon,minLat,maxLon,maxLat'", bbox);
                return;
            }

            double minLon = Double.parseDouble(parts[BBOX_INDEX_MIN_LON].trim());
            double minLat = Double.parseDouble(parts[BBOX_INDEX_MIN_LAT].trim());
            double maxLon = Double.parseDouble(parts[BBOX_INDEX_MAX_LON].trim());
            double maxLat = Double.parseDouble(parts[BBOX_INDEX_MAX_LAT].trim());

            // Validar coordenadas
            if (minLon > maxLon || minLat > maxLat) {
                log.warn("Coordenadas de BBOX inválidas: minLon={}, maxLon={}, minLat={}, maxLat={}",
                        minLon, maxLon, minLat, maxLat);
                return;
            }

            // CRS explícito para WGS84 (EPSG:4326)
            builder.queryParam(PARAM_SUBSETTING_CRS, CRS_EPSG_4326);

            // WCS 2.0.1 usa 'Long' y 'Lat' como nombres de dimensión
            // Los paréntesis deben ir pre-encoded porque UriComponentsBuilder los codificaría de nuevo
            String longSubset = SUBSET_LONG + ENCODING_LEFT_PAREN
                    + String.format("%.6f,%.6f", minLon, maxLon)
                    + ENCODING_RIGHT_PAREN;
            String latSubset = SUBSET_LAT + ENCODING_LEFT_PAREN
                    + String.format("%.6f,%.6f", minLat, maxLat)
                    + ENCODING_RIGHT_PAREN;

            builder.queryParam(PARAM_SUBSET, longSubset);
            builder.queryParam(PARAM_SUBSET, latSubset);

            log.info("BBOX {} convertido a subsets WCS con CRS EPSG:4326: Long({},{}) Lat({},{})",
                    bbox, minLon, maxLon, minLat, maxLat);

        } catch (NumberFormatException e) {
            log.warn("Error al parsear BBOX '{}': {}", bbox, e.getMessage());
        }
    }

    /**
     * Valida que la respuesta sea JSON y la retorna.
     */
    @SuppressWarnings("null") // Spring @NonNull en ResponseEntity.contentType()
    private ResponseEntity<String> validateAndReturnJsonResponse(ResponseEntity<String> response) {
        MediaType contentType = response.getHeaders().getContentType();

        if (contentType == null || !MediaType.APPLICATION_JSON.isCompatibleWith(contentType)) {
            String body = response.getBody();
            String message = body != null ? body : "Respuesta vacía de GeoServer";
            log.warn("GeoServer devolvió respuesta no-JSON: {}", message);
            throw GeoserverException.invalidResponse(
                    contentType != null ? contentType.toString() : null,
                    message
            );
        }

        String responseBody = response.getBody();
        return ResponseEntity
                .status(response.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(responseBody);
    }

    /**
     * Procesa la respuesta WCS según el tipo de operación.
     */
    @SuppressWarnings("null") // Spring @NonNull en HttpHeaders.setContentType()
    private ResponseEntity<byte[]> processWcsResponse(ResponseEntity<byte[]> response, String requestType) {
        HttpHeaders responseHeaders = new HttpHeaders();

        // Copiar Content-Type de la respuesta original
        if (response.getHeaders().getContentType() != null) {
            responseHeaders.setContentType(response.getHeaders().getContentType());
        }

        // Para GetCoverage, asegurar que el content-type es apropiado
        if (REQUEST_GET_COVERAGE.equalsIgnoreCase(requestType)) {
            MediaType contentType = response.getHeaders().getContentType();
            if (contentType == null) {
                responseHeaders.setContentType(MediaType.valueOf(OUTPUT_FORMAT_GEOTIFF));
            }

            byte[] body = response.getBody();
            log.debug("WCS GetCoverage response - status: {}, content-type: {}, size: {} bytes",
                    response.getStatusCode(),
                    responseHeaders.getContentType(),
                    body != null ? body.length : 0);
        } else {
            // Para DescribeCoverage y GetCapabilities, devolver XML
            responseHeaders.setContentType(MediaType.APPLICATION_XML);
        }

        return ResponseEntity
                .status(response.getStatusCode())
                .headers(responseHeaders)
                .body(response.getBody());
    }

    private HttpHeaders filterBinaryHeaders(HttpHeaders headers) {
        HttpHeaders filteredHeaders = new HttpHeaders();
        MediaType contentType = headers.getContentType();
        if (contentType != null) {
            filteredHeaders.setContentType(contentType);
        }
        if (headers.getContentLength() >= 0) {
            filteredHeaders.setContentLength(headers.getContentLength());
        }
        return filteredHeaders;
    }

    /**
     * Loguea todos los parámetros recibidos para depuración.
     */
    private void logAllParameters(HttpServletRequest request) {
        if (!log.isDebugEnabled()) {
            return;
        }
        Enumeration<String> paramNames = request.getParameterNames();
        StringBuilder sb = new StringBuilder("Parámetros WCS recibidos:");
        while (paramNames.hasMoreElements()) {
            String paramName = paramNames.nextElement();
            String[] paramValues = request.getParameterValues(paramName);
            if (paramValues != null) {
                for (String value : paramValues) {
                    sb.append("\n  ").append(paramName).append("=").append(value);
                }
            }
        }
        log.debug(sb.toString());
    }
}
