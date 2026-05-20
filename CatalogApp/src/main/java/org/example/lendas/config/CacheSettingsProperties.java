package org.example.lendas.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "lendas.cache")
public record CacheSettingsProperties(
        CacheSpec processTypes,
        CacheSpec vocabularies,
        CacheSpec dataTypes,
        CacheSpec featureTypes
) {

    public record CacheSpec(
            int ttlSeconds,
            int maxEntries
    ) {
    }
}

