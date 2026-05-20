package org.example.lendas.dto;

import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.lang.Nullable;

/**
 * Parámetros para verificar disponibilidad de datos.
 * <p>
 * Nota: Los nombres de parámetros deben usar camelCase para que Spring Boot
 * haga el binding correcto con el record (processIds, startTime, etc.)
 *
 * @param schema nombre del esquema (obligatorio)
 * @param name nombre del tipo de proceso (obligatorio)
 * @param processIds lista de IDs de procesos separados por coma (opcional)
 * @param featureIds lista de IDs de features separados por coma (opcional)
 * @param spatialFilter filtro espacial en formato WKT/EWKT (opcional)
 * @param startTime fecha de inicio ISO-8601 (opcional)
 * @param endTime fecha de fin ISO-8601 (opcional)
 */
public record AvailabilityRequest(
        @Parameter(description = "Nombre del esquema", required = true, example = "ctd_intecmar")
        String schema,
        @Parameter(description = "Nombre del tipo de proceso", required = true, example = "configuracion_ctd")
        String name,
        @Parameter(description = "Lista de IDs de procesos separados por coma", example = "1,2,3")
        @Nullable String processIds,
        @Parameter(description = "Lista de IDs de features separados por coma", example = "10,20,30")
        @Nullable String featureIds,
        @Parameter(description = "Filtro espacial en formato WKT (EWKT)", example = "SRID=4326;POLYGON((-8.5 43.3, -7.2 43.3, -7.2 44.0, -8.5 44.0, -8.5 43.3))")
        @Nullable String spatialFilter,
        @Parameter(description = "Fecha de inicio (ISO-8601)", example = "2024-01-01T00:00:00")
        @Nullable String startTime,
        @Parameter(description = "Fecha de fin (ISO-8601)", example = "2024-12-31T23:59:59")
        @Nullable String endTime
) {}
