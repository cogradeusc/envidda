package org.example.lendas.config;

/**
 * Nombres de caché utilizados en la aplicación.
 * <p>
 * Esta clase centraliza los nombres de todos los cachés para evitar
 * errores por typos y proporcionar autocompletado en IDEs.
 * <p>
 * Los nombres siguen el patrón: área_entidad (ej: catalog_processTypes)
 */
public final class CacheNames {

    private CacheNames() {
        throw new AssertionError("Cannot instantiate constants class");
    }

    // ============================================
    // Cachés de Catálogo (alta estabilidad)
    // ============================================

    /**
     * Caché para tipos de procesos.
     * TTL: 1 hora
     * Política: cachear por (filter, language)
     */
    public static final String CATALOG_PROCESS_TYPES = "catalog_processTypes";

    /**
     * Caché para vocabularios.
     * TTL: 4 horas
     * Política: cachear por (schema, name)
     */
    public static final String CATALOG_VOCABULARIES = "catalog_vocabularies";

    /**
     * Caché para tipos de datos.
     * TTL: 4 horas
     * Política: cachear por (schema, name)
     */
    public static final String CATALOG_DATA_TYPES = "catalog_dataTypes";

    /**
     * Caché para tipos de features.
     * TTL: 4 horas
     * Política: cachear por (schema, name)
     */
    public static final String CATALOG_FEATURE_TYPES = "catalog_featureTypes";

    // ============================================
    // Configuración de TTL (en segundos)
    // ============================================

    public static final int TTL_PROCESS_TYPES = 3600;      // 1 hora
    public static final int TTL_VOCABULARIES = 14400;      // 4 horas
    public static final int TTL_DATA_TYPES = 14400;        // 4 horas
    public static final int TTL_FEATURE_TYPES = 14400;     // 4 horas

    // ============================================
    // Límites de caché
    // ============================================

    public static final int MAX_ENTRIES_PROCESS_TYPES = 100;
    public static final int MAX_ENTRIES_VOCABULARIES = 500;
    public static final int MAX_ENTRIES_DATA_TYPES = 200;
    public static final int MAX_ENTRIES_FEATURE_TYPES = 200;
}
