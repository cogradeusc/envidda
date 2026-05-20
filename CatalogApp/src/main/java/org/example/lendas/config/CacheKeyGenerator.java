package org.example.lendas.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;

/**
 * Generador de claves de caché type-safe y consistente.
 * <p>
 * Proporciona métodos para generar claves de caché de forma estandarizada,
 * evitando colisiones y asegurando consistencia entre operaciones de
 * cacheo y evicción.
 * <p>
 * Las claves siguen el formato: prefijo::valor1::valor2::...
 */
public final class CacheKeyGenerator {

    private static final Logger log = LoggerFactory.getLogger(CacheKeyGenerator.class);
    private static final String SEPARATOR = "::";
    private static final String NULL_MARKER = "_NULL_";
    private static final String EMPTY_MARKER = "_EMPTY_";

    private CacheKeyGenerator() {
        throw new AssertionError("Cannot instantiate utility class");
    }

    /**
     * Genera una clave para process types.
     *
     * @param filter filtro de texto (puede ser null)
     * @param language código de idioma (puede ser null)
     * @return clave de caché
     */
    public static String forProcessTypes(String filter, String language) {
        return buildKey("processTypes", normalize(filter), normalize(language));
    }

    /**
     * Genera una clave para vocabulario.
     *
     * @param schema nombre del esquema
     * @param name nombre del vocabulario
     * @return clave de caché
     */
    public static String forVocabulary(String schema, String name) {
        return buildKey("vocabulary", normalize(schema), normalize(name));
    }

    /**
     * Genera una clave para tipo de dato.
     *
     * @param schema nombre del esquema
     * @param name nombre del tipo de dato
     * @return clave de caché
     */
    public static String forDataType(String schema, String name) {
        return buildKey("dataType", normalize(schema), normalize(name));
    }

    /**
     * Genera una clave para tipo de feature.
     *
     * @param schema nombre del esquema
     * @param name nombre del tipo de feature
     * @return clave de caché
     */
    public static String forFeatureType(String schema, String name) {
        return buildKey("featureType", normalize(schema), normalize(name));
    }

    /**
     * Genera una clave genérica para cualquier combinación de parámetros.
     *
     * @param prefix prefijo identificador
     * @param params parámetros a incluir en la clave
     * @return clave de caché
     */
    public static String generate(String prefix, Object... params) {
        if (prefix == null || prefix.isBlank()) {
            throw new IllegalArgumentException("Prefix cannot be null or empty");
        }

        String[] normalizedParams = Arrays.stream(params)
                .map(CacheKeyGenerator::normalize)
                .toArray(String[]::new);

        return buildKey(prefix, normalizedParams);
    }

    /**
     * Construye la clave final uniendo componentes.
     */
    private static String buildKey(String prefix, String... parts) {
        StringBuilder key = new StringBuilder(prefix);

        for (String part : parts) {
            key.append(SEPARATOR).append(part);
        }

        String result = key.toString();
        log.debug("Generated cache key: {}", result);
        return result;
    }

    /**
     * Normaliza un valor para uso en claves de caché.
     */
    private static String normalize(Object value) {
        if (value == null) {
            return NULL_MARKER;
        }

        String str = value.toString().trim();

        if (str.isEmpty()) {
            return EMPTY_MARKER;
        }

        // Normalizar: lowercase, sin espacios múltiples
        return str.toLowerCase().replaceAll("\\s+", "_");
    }

    /**
     * Extrae el prefijo de una clave de caché.
     */
    public static String extractPrefix(String cacheKey) {
        if (cacheKey == null || !cacheKey.contains(SEPARATOR)) {
            return cacheKey;
        }
        return cacheKey.substring(0, cacheKey.indexOf(SEPARATOR));
    }

    /**
     * Verifica si una clave corresponde a un prefijo dado.
     */
    public static boolean matchesPrefix(String cacheKey, String prefix) {
        return cacheKey != null && cacheKey.startsWith(prefix + SEPARATOR);
    }
}
