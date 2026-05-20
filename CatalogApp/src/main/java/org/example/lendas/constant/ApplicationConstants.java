package org.example.lendas.constant;

/**
 * Constantes de la aplicación LENDAS API.
 * <p>
 * Esta clase contiene constantes globales utilizadas en toda la aplicación
 * para evitar la duplicación de valores literales (magic strings/numbers).
 */
public final class ApplicationConstants {

    private ApplicationConstants() {
        throw new AssertionError("No se puede instanciar la clase de constantes");
    }

    // ============================================
    // Constantes de formato JSON
    // ============================================
    public static final String EMPTY_JSON_ARRAY = "[]";
    public static final String EMPTY_JSON_OBJECT = "{}";

    // ============================================
    // Constantes de paginación y límites
    // ============================================
    public static final int MAX_RETRY_ATTEMPTS = 3;

    // ============================================
    // Constantes de formato de fecha/hora
    // ============================================
    public static final String DEFAULT_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

    // ============================================
    // Constantes de filtros de texto
    // ============================================
    public static final String FTS_AND_OPERATOR = " & ";
    public static final String WHITESPACE_PATTERN = "\\s+";


}
