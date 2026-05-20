package org.example.lendas.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.lendas.service.CatalogQueryService;
import org.example.lendas.util.StringUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
@Tag(name = "Consultas de catálogo", description = "Operaciones de búsqueda y detalle")
public class CatalogQueryController {

    private final CatalogQueryService catalogQueryService;

    public CatalogQueryController(CatalogQueryService catalogQueryService) {
        this.catalogQueryService = catalogQueryService;
    }

    @Operation(summary = "Filtrar tipos de procesos")
    @GetMapping(value = "/filter-process-types", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> filterProcessTypes(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "start-time", required = false) String startTime,
            @RequestParam(value = "startTime", required = false) String legacyStartTime,
            @RequestParam(value = "end-time", required = false) String endTime,
            @RequestParam(value = "endTime", required = false) String legacyEndTime) {
        return ResponseEntity.ok(catalogQueryService.filterProcessTypes(
                schema, name, keyword, firstNonBlank(startTime, legacyStartTime), firstNonBlank(endTime, legacyEndTime)));
    }

    @Operation(summary = "Filtrar features de interés")
    @GetMapping(value = "/filter-feature-of-interest", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> filterFeatureOfInterest(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "spatial-filter", required = false) String spatialFilter,
            @RequestParam(value = "spatialFilter", required = false) String legacySpatialFilter,
            @RequestParam(value = "start-time", required = false) String startTime,
            @RequestParam(value = "startTime", required = false) String legacyStartTime,
            @RequestParam(value = "end-time", required = false) String endTime,
            @RequestParam(value = "endTime", required = false) String legacyEndTime) {
        return ResponseEntity.ok(catalogQueryService.filterFeatureOfInterest(
                schema,
                name,
                keyword,
                firstNonBlank(spatialFilter, legacySpatialFilter),
                firstNonBlank(startTime, legacyStartTime),
                firstNonBlank(endTime, legacyEndTime)));
    }

    @Operation(summary = "Obtener proceso por ID")
    @GetMapping(value = "/process-type", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getProcessById(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name,
            @RequestParam("id") int id,
            @RequestParam(value = "start-time", required = false) String startTime,
            @RequestParam(value = "end-time", required = false) String endTime) {
        return ResponseEntity.ok(catalogQueryService.getProcessById(schema, name, id, startTime, endTime));
    }

    @Operation(summary = "Obtener feature de interés por ID")
    @GetMapping(value = "/feature-of-interest", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getFeatureOfInterestById(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name,
            @RequestParam("id") long id,
            @RequestParam(value = "start-time", required = false) String startTime,
            @RequestParam(value = "end-time", required = false) String endTime) {
        return ResponseEntity.ok(catalogQueryService.getFeatureOfInterestById(
                schema, name, id, startTime, endTime));
    }

    private String firstNonBlank(String first, String second) {
        return StringUtils.isNotBlank(first) ? first : second;
    }
}

