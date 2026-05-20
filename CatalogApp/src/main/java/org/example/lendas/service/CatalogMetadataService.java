package org.example.lendas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.example.lendas.config.CacheNames;
import org.example.lendas.repository.CatalogMetadataRepository;
import org.example.lendas.util.StringUtils;
import org.example.lendas.util.ValidationUtils;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogMetadataService {

    private final CatalogMetadataRepository catalogMetadataRepository;

    public CatalogMetadataService(CatalogMetadataRepository catalogMetadataRepository) {
        this.catalogMetadataRepository = catalogMetadataRepository;
    }

    @Cacheable(
            value = CacheNames.CATALOG_PROCESS_TYPES,
            key = "T(org.example.lendas.config.CacheKeyGenerator).forProcessTypes(#textFilter, #textLanguage)",
            unless = "#result == null || #result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public JsonNode getProcessTypes(String textFilter, String textLanguage) {
        JsonNode result = catalogMetadataRepository.getProcessTypes(
                StringUtils.normalizeFtsFilter(textFilter),
                StringUtils.nullIfBlank(textLanguage));
        return isEmptyNode(result) ? JsonNodeFactory.instance.arrayNode() : result;
    }

    @Cacheable(
            value = CacheNames.CATALOG_DATA_TYPES,
            key = "T(org.example.lendas.config.CacheKeyGenerator).forDataType(#schema, #name)",
            unless = "#result == null || #result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public JsonNode getDataTypeByName(String schema, String name) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        JsonNode result = catalogMetadataRepository.getDataTypeByName(schema.trim(), name.trim());
        return isEmptyNode(result) ? JsonNodeFactory.instance.objectNode() : result;
    }

    @Cacheable(
            value = CacheNames.CATALOG_FEATURE_TYPES,
            key = "T(org.example.lendas.config.CacheKeyGenerator).forFeatureType(#schema, #name)",
            unless = "#result == null || #result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public JsonNode getFeatureTypeByName(String schema, String name) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        JsonNode result = catalogMetadataRepository.getFeatureTypeByName(schema.trim(), name.trim());
        return isEmptyNode(result) ? JsonNodeFactory.instance.objectNode() : result;
    }

    @Cacheable(
            value = CacheNames.CATALOG_VOCABULARIES,
            key = "T(org.example.lendas.config.CacheKeyGenerator).forVocabulary(#schema, #name)",
            unless = "#result == null || #result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public JsonNode getVocabularyByName(String schema, String name) {
        ValidationUtils.requireNonBlank(schema, "schema");
        ValidationUtils.requireNonBlank(name, "name");
        JsonNode result = catalogMetadataRepository.getVocabularyByName(schema.trim(), name.trim());
        return isEmptyNode(result) ? JsonNodeFactory.instance.objectNode() : result;
    }

    private boolean isEmptyNode(JsonNode node) {
        return node == null || node.isNull() || node.isEmpty();
    }
}

