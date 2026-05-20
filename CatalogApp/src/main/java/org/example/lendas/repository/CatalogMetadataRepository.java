package org.example.lendas.repository;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class CatalogMetadataRepository extends AbstractRepository<Void> {

    @Transactional(readOnly = true)
    public JsonNode getProcessTypes(@Nullable String keyword, @Nullable String language) {
        return executeJsonFunction("get_process_types",
                "keyword", keyword,
                "language", language);
    }

    @Transactional(readOnly = true)
    public JsonNode getDataTypeByName(String schema, String name) {
        return executeJsonFunction("get_data_type_by_name",
                "schema", schema,
                "name", name);
    }

    @Transactional(readOnly = true)
    public JsonNode getFeatureTypeByName(String schema, String name) {
        return executeJsonFunction("get_feature_type_by_name",
                "schema", schema,
                "name", name);
    }

    @Transactional(readOnly = true)
    public JsonNode getVocabularyByName(String schema, String name) {
        return executeJsonFunction("get_vocabulary_by_name",
                "schema", schema,
                "name", name);
    }
}

