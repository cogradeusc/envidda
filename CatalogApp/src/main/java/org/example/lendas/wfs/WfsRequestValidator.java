package org.example.lendas.wfs;

import org.example.lendas.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;

import java.util.ArrayList;
import java.util.List;

import static org.example.lendas.wfs.WfsConstants.*;

/**
 * Validador de parámetros para peticiones WFS/WCS.
 * <p>
 * Proporciona métodos estáticos para validar:
 * <ul>
 *     <li>Formato de BBOX (bounding box)</li>
 *     <li>Rango de maxFeatures</li>
 *     <li>Valores de typeName</li>
 *     <li>Coordenadas geográficas</li>
 * </ul>
 * <p>
 * Sigue el patrón Utility Class - no se puede instanciar.
 */
public final class WfsRequestValidator {

    private static final Logger log = LoggerFactory.getLogger(WfsRequestValidator.class);

    private WfsRequestValidator() {
        throw new AssertionError("Cannot instantiate utility class");
    }

    /**
     * Valida un objeto WfsRequest completo.
     *
     * @param request la petición a validar
     * @throws ValidationException si hay errores de validación
     */
    public static void validate(WfsRequest request) {
        List<String> errors = new ArrayList<>();

        // Validar typeName
        if (request.getTypeName() == null || request.getTypeName().isBlank()) {
            errors.add(ERROR_EMPTY_TYPENAME);
        }

        // Validar maxFeatures si está presente
        request.getMaxFeatures().ifPresent(maxFeatures -> {
            try {
                validateMaxFeatures(maxFeatures);
            } catch (IllegalArgumentException e) {
                errors.add(e.getMessage());
            }
        });

        // Validar bbox si está presente
        request.getBbox().ifPresent(bbox -> {
            try {
                validateBboxFormat(bbox);
            } catch (IllegalArgumentException e) {
                errors.add(e.getMessage());
            }
        });

        if (!errors.isEmpty()) {
            throw new ValidationException("Errores de validación WFS: " + String.join(", ", errors));
        }
    }

    /**
     * Valida el formato de un BBOX (bounding box).
     * <p>
     * Formato esperado: "minLon,minLat,maxLon,maxLat"
     *
     * @param bbox el string BBOX a validar
     * @throws IllegalArgumentException si el formato es inválido
     */
    public static void validateBboxFormat(String bbox) {
        if (bbox == null || bbox.isBlank()) {
            throw new IllegalArgumentException(ERROR_INVALID_BBOX_FORMAT);
        }

        String[] parts = bbox.split(BBOX_SEPARATOR);

        if (parts.length != BBOX_COORDINATE_COUNT) {
            log.warn("Formato de BBOX inválido: '{}'. Se esperaban {} valores, se encontraron {}",
                    bbox, BBOX_COORDINATE_COUNT, parts.length);
            throw new IllegalArgumentException(ERROR_INVALID_BBOX_FORMAT);
        }

        try {
            double minLon = Double.parseDouble(parts[BBOX_INDEX_MIN_LON].trim());
            double minLat = Double.parseDouble(parts[BBOX_INDEX_MIN_LAT].trim());
            double maxLon = Double.parseDouble(parts[BBOX_INDEX_MAX_LON].trim());
            double maxLat = Double.parseDouble(parts[BBOX_INDEX_MAX_LAT].trim());

            validateBboxCoordinates(minLon, minLat, maxLon, maxLat);

        } catch (NumberFormatException e) {
            log.warn("Error al parsear coordenadas de BBOX '{}': {}", bbox, e.getMessage());
            throw new IllegalArgumentException(ERROR_INVALID_BBOX_FORMAT + ". Las coordenadas deben ser números válidos.");
        }
    }

    /**
     * Valida que las coordenadas del BBOX sean lógicas.
     * <p>
     * Verifica que min < max para ambas dimensiones.
     *
     * @param minLon longitud mínima
     * @param minLat latitud mínima
     * @param maxLon longitud máxima
     * @param maxLat latitud máxima
     * @throws IllegalArgumentException si las coordenadas son inválidas
     */
    public static void validateBboxCoordinates(double minLon, double minLat, double maxLon, double maxLat) {
        List<String> errors = new ArrayList<>();

        if (minLon > maxLon) {
            errors.add("minLon (" + minLon + ") debe ser menor o igual que maxLon (" + maxLon + ")");
        }

        if (minLat > maxLat) {
            errors.add("minLat (" + minLat + ") debe ser menor o igual que maxLat (" + maxLat + ")");
        }

        // Validar rangos geográficos
        if (minLon < -180 || maxLon > 180) {
            errors.add("longitud debe estar entre -180 y 180");
        }

        if (minLat < -90 || maxLat > 90) {
            errors.add("latitud debe estar entre -90 y 90");
        }

        if (!errors.isEmpty()) {
            String message = ERROR_INVALID_BBOX_COORDINATES + ": " + String.join(", ", errors);
            log.warn(message);
            throw new IllegalArgumentException(message);
        }
    }

    /**
     * Valida que maxFeatures esté dentro del rango permitido.
     *
     * @param maxFeatures valor a validar
     * @throws IllegalArgumentException si está fuera de rango
     */
    public static void validateMaxFeatures(int maxFeatures) {
        if (maxFeatures < MIN_MAX_FEATURES || maxFeatures > MAX_MAX_FEATURES) {
            String message = String.format(ERROR_INVALID_MAX_FEATURES, MIN_MAX_FEATURES, MAX_MAX_FEATURES);
            log.warn("maxFeatures inválido: {}. {}", maxFeatures, message);
            throw new IllegalArgumentException(message);
        }
    }

    /**
     * Valida que un typeName no esté vacío.
     *
     * @param typeName valor a validar
     * @throws IllegalArgumentException si está vacío
     */
    public static void validateTypeName(@Nullable String typeName) {
        if (typeName == null || typeName.isBlank()) {
            throw new IllegalArgumentException(ERROR_EMPTY_TYPENAME);
        }
    }

    /**
     * Intenta parsear un BBOX y retorna el resultado.
     * <p>
     * Método de conveniencia que retorna null en lugar de lanzar excepción.
     *
     * @param bbox string a parsear
     * @return array de doubles [minLon, minLat, maxLon, maxLat] o null si es inválido
     */
    public static double[] tryParseBbox(String bbox) {
        if (bbox == null || bbox.isBlank()) {
            return null;
        }

        try {
            String[] parts = bbox.split(BBOX_SEPARATOR);
            if (parts.length != BBOX_COORDINATE_COUNT) {
                return null;
            }

            double[] coords = new double[BBOX_COORDINATE_COUNT];
            for (int i = 0; i < BBOX_COORDINATE_COUNT; i++) {
                coords[i] = Double.parseDouble(parts[i].trim());
            }

            validateBboxCoordinates(
                    coords[BBOX_INDEX_MIN_LON],
                    coords[BBOX_INDEX_MIN_LAT],
                    coords[BBOX_INDEX_MAX_LON],
                    coords[BBOX_INDEX_MAX_LAT]
            );

            return coords;

        } catch (IllegalArgumentException e) {
            log.debug("No se pudo parsear BBOX '{}': {}", bbox, e.getMessage());
            return null;
        }
    }
}