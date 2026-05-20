package org.example.lendas.repository;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Repositorio para operaciones de disponibilidad de datos.
 * <p>
 * Proporciona métodos para verificar la disponibilidad de datos
 * según diferentes criterios (temporales, espaciales, procesos, features).
 * <p>
 * Extiende {@link AbstractRepository} para heredar manejo centralizado
 * de excepciones y eliminar código duplicado de try-catch.
 */
@Repository
public class AvailabilityRepository extends AbstractRepository<Void> {

    /**
     * Verifica la disponibilidad de datos según los criterios especificados.
     *
     * @param processTypeSchema esquema del tipo de proceso
     * @param processTypeName nombre del tipo de proceso
     * @param processIds lista opcional de IDs de procesos (separados por coma)
     * @param featureIds lista opcional de IDs de features (separados por coma)
     * @param spatialFilter filtro espacial opcional (WKT)
     * @param startTime fecha de inicio opcional
     * @param endTime fecha de fin opcional
     * @return JSON con la información de disponibilidad
     * @throws org.example.lendas.exception.DatabaseException si ocurre un error de base de datos
     */
    @Transactional(readOnly = true)
    public JsonNode checkDataAvailability(
            String processTypeSchema,
            String processTypeName,
            @Nullable String processIds,
            @Nullable String featureIds,
            @Nullable String spatialFilter,
            @Nullable LocalDateTime startTime,
            @Nullable LocalDateTime endTime) {

        log.debug("Verificando disponibilidad - schema: {}, name: {}, processIds: {}, featureIds: {}",
                processTypeSchema, processTypeName, processIds, featureIds);

        return executeJsonFunction("check_data_availability",
                "schema", processTypeSchema,
                "name", processTypeName,
                "process_ids", processIds,
                "feature_ids", featureIds,
                "spatial_filter", spatialFilter,
                "start_time", startTime,
                "end_time", endTime);
    }
}
