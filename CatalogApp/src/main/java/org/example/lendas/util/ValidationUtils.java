package org.example.lendas.util;

import org.example.lendas.exception.ValidationException;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/**
 * Utilidades para validación de datos.
 * <p>
 * Proporciona métodos para validar parámetros de entrada y lanzar
 * excepciones descriptivas cuando las validaciones fallan.
 */
public final class ValidationUtils {

    private static final ZoneId API_INPUT_ZONE = ZoneId.of("Europe/Madrid");

    private ValidationUtils() {
        throw new AssertionError("No se puede instanciar la clase de utilidades");
    }

    /**
     * Valida que un parámetro obligatorio no esté vacío.
     *
     * @param value el valor a validar
     * @param paramName el nombre del parámetro para el mensaje de error
     * @throws ValidationException si el valor está vacío
     */
    public static void requireNonBlank(String value, String paramName) {
        if (StringUtils.isBlank(value)) {
            throw new ValidationException("El parámetro '" + paramName + "' es obligatorio");
        }
    }

    /**
     * Valida que un objeto no sea nulo.
     *
     * @param value el valor a validar
     * @param paramName el nombre del parámetro para el mensaje de error
     * @throws ValidationException si el valor es nulo
     */
    public static void requireNonNull(Object value, String paramName) {
        if (value == null) {
            throw new ValidationException("El parámetro '" + paramName + "' es obligatorio");
        }
    }

    /**
     * Parsea una fecha ISO-8601 de forma segura y la normaliza a UTC.
     *
     * @param dateTimeStr la cadena de fecha a parsear
     * @param paramName el nombre del parámetro para el mensaje de error
     * @return LocalDateTime UTC parseado o null si la entrada es null/vacía
     * @throws ValidationException si el formato de fecha es inválido
     */
    public static LocalDateTime parseDateTime(String dateTimeStr, String paramName) {
        if (StringUtils.isBlank(dateTimeStr)) {
            return null;
        }
        try {
            String trimmedDateTime = dateTimeStr.trim();
            try {
                return OffsetDateTime.parse(trimmedDateTime)
                        .withOffsetSameInstant(ZoneOffset.UTC)
                        .toLocalDateTime();
            } catch (DateTimeParseException ignored) {
                return LocalDateTime.parse(trimmedDateTime)
                        .atZone(API_INPUT_ZONE)
                        .withZoneSameInstant(ZoneOffset.UTC)
                        .toLocalDateTime();
            }
        } catch (DateTimeParseException e) {
            throw new ValidationException(
                    "El parámetro '" + paramName + "' tiene un formato de fecha inválido. " +
                            "Use el formato ISO-8601 (ej: 2024-01-15T10:30:00)", e);
        }
    }

    /**
     * Valida que un ID sea positivo.
     *
     * @param id el ID a validar
     * @param paramName el nombre del parámetro para el mensaje de error
     * @throws ValidationException si el ID no es positivo
     */
    public static void requirePositive(int id, String paramName) {
        if (id <= 0) {
            throw new ValidationException("El parámetro '" + paramName + "' debe ser un número positivo");
        }
    }

    /**
     * Valida que un ID (long) sea positivo.
     *
     * @param id el ID a validar
     * @param paramName el nombre del parámetro para el mensaje de error
     * @throws ValidationException si el ID no es positivo
     */
    public static void requirePositive(long id, String paramName) {
        if (id <= 0) {
            throw new ValidationException("El parámetro '" + paramName + "' debe ser un número positivo");
        }
    }

}
