package org.example.lendas.wfs;

import org.springframework.lang.Nullable;

import java.util.Objects;
import java.util.Optional;

import static org.example.lendas.wfs.WfsConstants.*;

/**
 * Representa una petición WFS (Web Feature Service) inmutable.
 * <p>
 * Esta clase encapsula todos los parámetros de una petición WFS:
 * <ul>
 *     <li>typeName - nombre del tipo de feature</li>
 *     <li>cqlFilter - filtro CQL opcional</li>
 *     <li>bbox - bounding box opcional</li>
 *     <li>maxFeatures - número máximo de features</li>
 * </ul>
 * <p>
 * Uso con Builder:
 * <pre>
 * WfsRequest request = WfsRequest.builder()
 *     .typeName("ccmm:estaciones")
 *     .cqlFilter("nombre LIKE '%A Coruña%'")
 *     .maxFeatures(100)
 *     .build();
 * </pre>
 */
public final class WfsRequest {

    private final String typeName;
    private final String cqlFilter;
    private final String bbox;
    private final Integer maxFeatures;

    private WfsRequest(Builder builder) {
        this.typeName = builder.typeName;
        this.cqlFilter = builder.cqlFilter;
        this.bbox = builder.bbox;
        this.maxFeatures = builder.maxFeatures;
    }

    /**
     * Crea un nuevo builder para construir una instancia de WfsRequest.
     */
    public static Builder builder() {
        return new Builder();
    }

    // ============================================
    // Getters
    // ============================================

    /**
     * Obtiene el nombre del tipo de feature.
     *
     * @return el typeName configurado o el valor por defecto
     */
    public String getTypeName() {
        return typeName != null ? typeName : DEFAULT_TYPENAME;
    }

    /**
     * Obtiene el filtro CQL si está presente.
     *
     * @return Optional con el filtro CQL
     */
    public Optional<String> getCqlFilter() {
        return Optional.ofNullable(cqlFilter);
    }

    /**
     * Obtiene el bounding box si está presente.
     *
     * @return Optional con el BBOX
     */
    public Optional<String> getBbox() {
        return Optional.ofNullable(bbox);
    }

    /**
     * Obtiene el número máximo de features si está configurado.
     *
     * @return Optional con maxFeatures
     */
    public Optional<Integer> getMaxFeatures() {
        return Optional.ofNullable(maxFeatures);
    }

    /**
     * Verifica si se ha configurado un filtro CQL.
     */
    public boolean hasCqlFilter() {
        return cqlFilter != null && !cqlFilter.isBlank();
    }

    /**
     * Verifica si se ha configurado un bounding box.
     */
    public boolean hasBbox() {
        return bbox != null && !bbox.isBlank();
    }

    // ============================================
    // Builder
    // ============================================

    /**
     * Builder para construir instancias de {@link WfsRequest}.
     * <p>
     * Permite configurar parámetros opcionales de forma fluida y
     * valida los valores antes de construir la instancia.
     */
    public static class Builder {
        private String typeName;
        private String cqlFilter;
        private String bbox;
        private Integer maxFeatures;

        private Builder() {
            // Constructor privado - usar WfsRequest.builder()
        }

        /**
         * Establece el nombre del tipo de feature.
         *
         * @param typeName nombre del tipo (ej: "ccmm:estaciones")
         * @return this builder
         * @throws IllegalArgumentException si typeName está vacío
         */
        public Builder typeName(@Nullable String typeName) {
            if (typeName != null && typeName.isBlank()) {
                throw new IllegalArgumentException(ERROR_EMPTY_TYPENAME);
            }
            this.typeName = typeName;
            return this;
        }

        /**
         * Establece el filtro CQL para la consulta.
         *
         * @param cqlFilter filtro en formato CQL (ej: "nombre = 'Valor'")
         * @return this builder
         */
        public Builder cqlFilter(@Nullable String cqlFilter) {
            this.cqlFilter = cqlFilter;
            return this;
        }

        /**
         * Establece el bounding box para filtrado espacial.
         *
         * @param bbox formato "minLon,minLat,maxLon,maxLat"
         * @return this builder
         * @throws IllegalArgumentException si el formato es inválido
         */
        public Builder bbox(@Nullable String bbox) {
            if (bbox != null && !bbox.isBlank()) {
                WfsRequestValidator.validateBboxFormat(bbox);
            }
            this.bbox = bbox;
            return this;
        }

        /**
         * Establece el número máximo de features a retornar.
         *
         * @param maxFeatures valor entre MIN_MAX_FEATURES y MAX_MAX_FEATURES
         * @return this builder
         * @throws IllegalArgumentException si el valor está fuera de rango
         */
        public Builder maxFeatures(@Nullable Integer maxFeatures) {
            if (maxFeatures != null) {
                WfsRequestValidator.validateMaxFeatures(maxFeatures);
            }
            this.maxFeatures = maxFeatures;
            return this;
        }

        /**
         * Construye la instancia de {@link WfsRequest}.
         *
         * @return nueva instancia inmutable de WfsRequest
         */
        public WfsRequest build() {
            return new WfsRequest(this);
        }
    }

    // ============================================
    // equals, hashCode, toString
    // ============================================

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WfsRequest)) return false;
        WfsRequest that = (WfsRequest) o;
        return Objects.equals(typeName, that.typeName) &&
                Objects.equals(cqlFilter, that.cqlFilter) &&
                Objects.equals(bbox, that.bbox) &&
                Objects.equals(maxFeatures, that.maxFeatures);
    }

    @Override
    public int hashCode() {
        return Objects.hash(typeName, cqlFilter, bbox, maxFeatures);
    }

    @Override
    public String toString() {
        return "WfsRequest{" +
                "typeName='" + getTypeName() + '\'' +
                ", cqlFilter=" + getCqlFilter().map(s -> "'" + s + "'").orElse("null") +
                ", bbox=" + getBbox().orElse("null") +
                ", maxFeatures=" + getMaxFeatures().orElse(null) +
                '}';
    }
}
