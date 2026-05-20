package org.example.lendas.util;

import org.example.lendas.constant.ApplicationConstants;

/**
 * Utilidades para manipulación de cadenas de texto.
 * <p>
 * Proporciona métodos comunes para validación y transformación de strings
 * que se utilizan en toda la aplicación.
 */
public final class StringUtils {

    private StringUtils() {
        throw new AssertionError("No se puede instanciar la clase de utilidades");
    }

    /**
     * Verifica si una cadena es nula o está vacía (sin contenido o solo espacios).
     *
     * @param str la cadena a verificar
     * @return true si la cadena es nula, vacía o solo contiene espacios en blanco
     */
    public static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }

    /**
     * Verifica si una cadena tiene contenido (no es nula ni vacía).
     *
     * @param str la cadena a verificar
     * @return true si la cadena tiene contenido
     */
    public static boolean isNotBlank(String str) {
        return !isBlank(str);
    }

    /**
     * Normaliza un filtro de texto para búsquedas full-text.
     * Elimina espacios extra y reemplaza espacios por el operador AND.
     *
     * @param filter el filtro a normalizar
     * @return el filtro normalizado o null si está vacío
     */
    public static String normalizeFtsFilter(String filter) {
        if (isBlank(filter)) {
            return null;
        }
        return filter.trim().replaceAll(ApplicationConstants.WHITESPACE_PATTERN,
                ApplicationConstants.FTS_AND_OPERATOR);
    }

    /**
     * Retorna el valor proporcionado o null si está vacío.
     *
     * @param value el valor a verificar
     * @return el valor original o null si está vacío
     */
    public static String nullIfBlank(String value) {
        return isBlank(value) ? null : value.trim();
    }

    /**
     * Escapa caracteres especiales para JSON.
     *
     * @param input la cadena a escapar
     * @return la cadena escapada segura para JSON
     */
    public static String escapeForJson(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

}
