package org.example.lendas.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "lendas.geoserver")
public record GeoserverProperties(
        String baseUrl,
        String wcsUrl,
        String wmsUrl
) {
}

