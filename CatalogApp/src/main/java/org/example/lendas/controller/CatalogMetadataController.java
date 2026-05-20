package org.example.lendas.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.lendas.service.CatalogMetadataService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
@Tag(name = "Catálogo", description = "Operaciones de consulta de metadatos")
public class CatalogMetadataController {

    private final CatalogMetadataService catalogMetadataService;

    public CatalogMetadataController(CatalogMetadataService catalogMetadataService) {
        this.catalogMetadataService = catalogMetadataService;
    }

    @Operation(summary = "Obtener tipos de procesos")
    @GetMapping(value = "/process-types", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getProcessTypes(
            @Parameter(description = "Filtro de texto para búsqueda", example = "temperatura")
            @RequestParam(value = "filter", required = false) String filter,
            @Parameter(description = "Código de idioma", example = "spa")
            @RequestParam(value = "lang", required = false) String language) {
        return ResponseEntity.ok(catalogMetadataService.getProcessTypes(filter, language));
    }

    @Operation(summary = "Obtener tipo de dato")
    @GetMapping(value = "/data-type", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getDataTypeByName(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name) {
        return ResponseEntity.ok(catalogMetadataService.getDataTypeByName(schema, name));
    }

    @Operation(summary = "Obtener tipo de feature")
    @GetMapping(value = "/feature-type", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getFeatureTypeByName(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name) {
        return ResponseEntity.ok(catalogMetadataService.getFeatureTypeByName(schema, name));
    }

    @Operation(summary = "Obtener vocabulario")
    @GetMapping(value = "/vocabulary", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> getVocabularyByName(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name) {
        return ResponseEntity.ok(catalogMetadataService.getVocabularyByName(schema, name));
    }
}

