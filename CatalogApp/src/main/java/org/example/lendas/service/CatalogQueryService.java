package org.example.lendas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.example.lendas.repository.CatalogQueryRepository;
import org.example.lendas.util.StringUtils;
import org.example.lendas.util.ValidationUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogQueryService {

    private final CatalogQueryRepository catalogQueryRepository;

    public CatalogQueryService(CatalogQueryRepository catalogQueryRepository) {
        this.catalogQueryRepository = catalogQueryRepository;
    }

    @Transactional(readOnly = true)
    public JsonNode filterProcessTypes(String schema, String name, String keyword,
                                       String startTime, String endTime) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        JsonNode result = catalogQueryRepository.filterProcessTypes(
                schema.trim(),
                name.trim(),
                StringUtils.normalizeFtsFilter(keyword),
                ValidationUtils.parseDateTime(startTime, "start-time"),
                ValidationUtils.parseDateTime(endTime, "end-time"));
        return isEmptyNode(result) ? JsonNodeFactory.instance.arrayNode() : result;
    }

    @Transactional(readOnly = true)
    public JsonNode filterFeatureOfInterest(String schema, String name, String keyword,
                                            String spatialFilter, String startTime, String endTime) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        JsonNode result = catalogQueryRepository.filterFeatureOfInterest(
                schema.trim(),
                name.trim(),
                StringUtils.normalizeFtsFilter(keyword),
                StringUtils.nullIfBlank(spatialFilter),
                ValidationUtils.parseDateTime(startTime, "start-time"),
                ValidationUtils.parseDateTime(endTime, "end-time"));
        return isEmptyNode(result) ? JsonNodeFactory.instance.arrayNode() : result;
    }

    @Transactional(readOnly = true)
    public JsonNode getProcessById(String schema, String name, int id, String startTime, String endTime) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        ValidationUtils.requirePositive(id, "id");
        JsonNode result = catalogQueryRepository.getProcessById(
                schema.trim(),
                name.trim(),
                id,
                ValidationUtils.parseDateTime(startTime, "start-time"),
                ValidationUtils.parseDateTime(endTime, "end-time"));
        return isEmptyNode(result) ? JsonNodeFactory.instance.objectNode() : result;
    }

    @Transactional(readOnly = true)
    public JsonNode getFeatureOfInterestById(String schema, String name, long id,
                                             String startTime, String endTime) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        ValidationUtils.requirePositive(id, "id");
        JsonNode result = catalogQueryRepository.getFeatureOfInterestById(
                schema.trim(),
                name.trim(),
                id,
                ValidationUtils.parseDateTime(startTime, "start-time"),
                ValidationUtils.parseDateTime(endTime, "end-time"));
        return isEmptyNode(result) ? JsonNodeFactory.instance.objectNode() : result;
    }

    private boolean isEmptyNode(JsonNode node) {
        return node == null || node.isNull() || node.isEmpty();
    }
}

