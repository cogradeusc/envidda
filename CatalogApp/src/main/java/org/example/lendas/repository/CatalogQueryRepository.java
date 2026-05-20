package org.example.lendas.repository;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public class CatalogQueryRepository extends AbstractRepository<Void> {

    @Transactional(readOnly = true)
    public JsonNode filterProcessTypes(
            String schema,
            String name,
            @Nullable String keyword,
            @Nullable LocalDateTime startTime,
            @Nullable LocalDateTime endTime) {

        return executeJsonFunction("filter_process",
                "schema", schema,
                "name", name,
                "keyword", keyword,
                "start_time", startTime,
                "end_time", endTime);
    }

    @Transactional(readOnly = true)
    public JsonNode filterFeatureOfInterest(
            String schema,
            String name,
            @Nullable String keyword,
            @Nullable String spatialFilter,
            @Nullable LocalDateTime startTime,
            @Nullable LocalDateTime endTime) {

        return executeJsonFunction("filter_featureofinterest",
                "schema", schema,
                "name", name,
                "keyword", keyword,
                "spatial_filter", spatialFilter,
                "start_time", startTime,
                "end_time", endTime);
    }

    @Transactional(readOnly = true)
    public JsonNode getProcessById(
            String schema,
            String name,
            int id,
            @Nullable LocalDateTime startTime,
            @Nullable LocalDateTime endTime) {

        return executeJsonFunction("get_process_by_id",
                "schema", schema,
                "name", name,
                "id", id,
                "start_time", startTime,
                "end_time", endTime);
    }

    @Transactional(readOnly = true)
    public JsonNode getFeatureOfInterestById(
            String schema,
            String name,
            long id,
            @Nullable LocalDateTime startTime,
            @Nullable LocalDateTime endTime) {

        return executeJsonFunction("get_featureofinterest_by_id",
                "feature_type_schema", schema,
                "feature_type_name", name,
                "id", id,
                "start_time", startTime,
                "end_time", endTime);
    }
}

