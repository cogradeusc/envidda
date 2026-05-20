package org.example.lendas.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.example.lendas.service.GeoserverProxyService;
import org.example.lendas.wfs.WfsRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador proxy para GeoServer WFS y WCS.
 * <p>
 * Redirige peticiones WFS (Web Feature Service) y WCS (Web Coverage Service)
 * a GeoServer, proporcionando una capa de abstracción y manejo de errores consistente.
 * <p>
 * Este controller es "thin" - solo maneja HTTP y delega toda la lógica de negocio
 * al {@link GeoserverProxyService}.
 */
@RestController
@RequestMapping("/api/geoserver")
@Tag(name = "GeoServer Proxy", description = "Proxy para servicios WFS y WCS de GeoServer")
public class GeoserverProxyController {

    private static final Logger log = LoggerFactory.getLogger(GeoserverProxyController.class);

    private final GeoserverProxyService geoserverProxyService;

    public GeoserverProxyController(GeoserverProxyService geoserverProxyService) {
        this.geoserverProxyService = geoserverProxyService;
    }

    /**
     * Proxy para peticiones WFS a GeoServer.
     *
     * @param typeName    nombre del tipo de feature
     * @param cqlFilter   filtro CQL opcional
     * @param bbox        bounding box opcional
     * @param maxFeatures número máximo de features a retornar
     * @return respuesta JSON de GeoServer
     */
    @Operation(
        summary = "Proxy WFS (Web Feature Service)",
        description = "Redirige peticiones WFS a GeoServer para consultar features geoespaciales. " +
                      "Soporta filtros CQL, bounding boxes y limitación de resultados."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Consulta WFS exitosa",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    value = "{\"type\": \"FeatureCollection\", \"features\": [...]}"
                )
            )
        ),
        @ApiResponse(responseCode = "400", description = "Parámetros inválidos"),
        @ApiResponse(responseCode = "502", description = "Error de comunicación con GeoServer")
    })
    @GetMapping(value = "/wfs", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> proxyWfsRequest(
            @Parameter(description = "Nombre del tipo de feature", example = "ccmm:observation_configuracion_ctd_wfs")
            @RequestParam(value = "typeName", required = false) String typeName,
            @Parameter(description = "Filtro CQL", example = "procedure='sensor_temp_001'")
            @RequestParam(value = "cql_filter", required = false) String cqlFilter,
            @Parameter(description = "Bounding box (minLon,minLat,maxLon,maxLat)", example = "-8.5,42.3,-7.2,43.5")
            @RequestParam(value = "bbox", required = false) String bbox,
            @Parameter(description = "Número máximo de features", example = "1000")
            @RequestParam(value = "maxFeatures", required = false) Integer maxFeatures) {

        log.debug("GET /api/geoserver/wfs - typeName: {}, cqlFilter: {}, bbox: {}",
                typeName, cqlFilter, bbox);

        // Construir la petición usando el Builder
        WfsRequest request = WfsRequest.builder()
                .typeName(typeName)
                .cqlFilter(cqlFilter)
                .bbox(bbox)
                .maxFeatures(maxFeatures)
                .build();

        // Delegar al servicio
        return geoserverProxyService.executeWfsRequest(request);
    }

    /**
     * Proxy para peticiones WCS a GeoServer.
     * <p>
     * Soporta operaciones GetCoverage, DescribeCoverage y GetCapabilities.
     * GetCoverage devuelve datos binarios (imágenes TIFF), mientras que
     * DescribeCoverage y GetCapabilities devuelven XML.
     * <p>
     * Si se proporciona el parámetro 'bbox' (formato: minLon,minLat,maxLon,maxLat),
     * se convierte automáticamente a parámetros 'subset' de WCS 2.0.1.
     *
     * @param request el objeto HttpServletRequest con todos los parámetros
     * @param bbox    bounding box opcional en formato "minLon,minLat,maxLon,maxLat"
     * @return respuesta de GeoServer (binaria para GetCoverage, XML para otras)
     */
    @Operation(
        summary = "Proxy WCS (Web Coverage Service)",
        description = "Redirige peticiones WCS a GeoServer para consultar coberturas raster. " +
                      "Soporta GetCoverage (datos binarios), DescribeCoverage y GetCapabilities (XML)."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Consulta WCS exitosa - Devuelve datos raster (image/tiff) para GetCoverage o XML para DescribeCoverage/GetCapabilities"
        ),
        @ApiResponse(responseCode = "400", description = "Parámetros inválidos"),
        @ApiResponse(responseCode = "502", description = "Error de comunicación con GeoServer")
    })
    @GetMapping("/wcs")
    public ResponseEntity<byte[]> proxyWcsRequest(
            HttpServletRequest request,
            @Parameter(description = "Bounding box (minLon,minLat,maxLon,maxLat)", example = "-8.5,42.3,-7.2,43.5")
            @RequestParam(value = "bbox", required = false) String bbox) {

        log.debug("GET /api/geoserver/wcs - bbox: {}", bbox);

        // Delegar al servicio
        return geoserverProxyService.executeWcsRequest(request, bbox);
    }

    @Operation(
        summary = "Proxy WMS (Web Map Service)",
        description = "Redirige peticiones WMS a GeoServer para consultar imágenes de mapas."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Consulta WMS exitosa"),
        @ApiResponse(responseCode = "400", description = "Parámetros inválidos"),
        @ApiResponse(responseCode = "502", description = "Error de comunicación con GeoServer")
    })
    @GetMapping("/wms")
    public ResponseEntity<byte[]> proxyWmsRequest(HttpServletRequest request) {
        log.debug("GET /api/geoserver/wms");
        return geoserverProxyService.executeWmsRequest(request);
    }
}
