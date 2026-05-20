package org.example.lendas.dto;

import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Parámetros para filtrar tipos de procesos.
 *
 * @param schema nombre del esquema (obligatorio)
 * @param name nombre del tipo de proceso (obligatorio)
 * @param keyword palabra clave para filtrar (opcional)
 * @param startTime fecha de inicio ISO-8601 (opcional)
 * @param endTime fecha de fin ISO-8601 (opcional)
 */
public record ProcessFilterRequest(
        @Parameter(description = "Nombre del esquema", required = true, example = "ctd_intecmar")
        @RequestParam("schema")
        String schema,
        @Parameter(description = "Nombre del tipo de proceso", required = true, example = "configuracion_ctd")
        @RequestParam("name")
        String name,
        @Parameter(description = "Palabra clave para filtrar", example = "temperatura")
        @RequestParam(value = "keyword", required = false)
        @Nullable String keyword,
        @Parameter(description = "Fecha de inicio (ISO-8601)", example = "2024-01-01T00:00:00")
        @RequestParam(value = "start-time", required = false)
        @Nullable String startTime,
        @Parameter(description = "Fecha de fin (ISO-8601)", example = "2024-12-31T23:59:59")
        @RequestParam(value = "end-time", required = false)
        @Nullable String endTime
) {}
