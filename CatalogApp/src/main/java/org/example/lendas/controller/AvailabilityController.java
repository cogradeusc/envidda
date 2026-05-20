package org.example.lendas.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.lendas.service.AvailabilityService;
import org.example.lendas.util.StringUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
@Tag(name = "Disponibilidad", description = "Operaciones de disponibilidad de datos")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @Operation(summary = "Verificar disponibilidad de datos")
    @GetMapping(value = "/check-availability", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> checkDataAvailability(
            @RequestParam("schema") String schema,
            @RequestParam("name") String name,
            @RequestParam(value = "process-ids", required = false) String processIds,
            @RequestParam(value = "processIds", required = false) String legacyProcessIds,
            @RequestParam(value = "feature-ids", required = false) String featureIds,
            @RequestParam(value = "featureIds", required = false) String legacyFeatureIds,
            @RequestParam(value = "spatial-filter", required = false) String spatialFilter,
            @RequestParam(value = "spatialFilter", required = false) String legacySpatialFilter,
            @RequestParam(value = "start-time", required = false) String startTime,
            @RequestParam(value = "startTime", required = false) String legacyStartTime,
            @RequestParam(value = "end-time", required = false) String endTime,
            @RequestParam(value = "endTime", required = false) String legacyEndTime) {

        return ResponseEntity.ok(availabilityService.checkDataAvailability(
                schema,
                name,
                firstNonBlank(processIds, legacyProcessIds),
                firstNonBlank(featureIds, legacyFeatureIds),
                firstNonBlank(spatialFilter, legacySpatialFilter),
                firstNonBlank(startTime, legacyStartTime),
                firstNonBlank(endTime, legacyEndTime)));
    }

    private String firstNonBlank(String first, String second) {
        return StringUtils.isNotBlank(first) ? first : second;
    }
}
