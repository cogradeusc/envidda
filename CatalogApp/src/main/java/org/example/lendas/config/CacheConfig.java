package org.example.lendas.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import static org.example.lendas.config.CacheNames.*;

/**
 * Configuración de caching para la aplicación LENDAS.
 * <p>
 * Utiliza Caffeine como proveedor de caché por su alto rendimiento
 * y características avanzadas (TTL, tamaño máximo, estadísticas).
 * <p>
 * Los cachés configurados:
 * <ul>
 *     <li>Process Types: 1 hora TTL, 100 entradas máximo</li>
 *     <li>Vocabularies: 4 horas TTL, 500 entradas máximo</li>
 *     <li>Data Types: 4 horas TTL, 200 entradas máximo</li>
 *     <li>Feature Types: 4 horas TTL, 200 entradas máximo</li>
 * </ul>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);
    private final CacheSettingsProperties cacheSettingsProperties;

    public CacheConfig(CacheSettingsProperties cacheSettingsProperties) {
        this.cacheSettingsProperties = cacheSettingsProperties;
    }

    /**
     * Configura el CacheManager con múltiples cachés con diferentes políticas.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        configureCache(cacheManager, CATALOG_PROCESS_TYPES, cacheSettingsProperties.processTypes());
        configureCache(cacheManager, CATALOG_VOCABULARIES, cacheSettingsProperties.vocabularies());
        configureCache(cacheManager, CATALOG_DATA_TYPES, cacheSettingsProperties.dataTypes());
        configureCache(cacheManager, CATALOG_FEATURE_TYPES, cacheSettingsProperties.featureTypes());

        log.info("CacheManager configurado con cachés: {}",
                Arrays.asList(CATALOG_PROCESS_TYPES, CATALOG_VOCABULARIES,
                        CATALOG_DATA_TYPES, CATALOG_FEATURE_TYPES));

        return cacheManager;
    }

    /**
     * Configura un caché individual con las políticas especificadas.
     *
     * @param cacheManager el gestor de cachés donde registrar
     * @param name nombre del caché
     * @param maxEntries número máximo de entradas
     * @param ttlSeconds tiempo de vida en segundos
     */
    private void configureCache(CaffeineCacheManager cacheManager, String name,
                                CacheSettingsProperties.CacheSpec cacheSpec) {
        Objects.requireNonNull(cacheManager, "cacheManager is required");
        String cacheName = Objects.requireNonNull(name, "Cache name is required");
        CacheSettingsProperties.CacheSpec spec = Objects.requireNonNull(cacheSpec, "Cache spec is required");

        Caffeine<Object, Object> caffeine = Caffeine.newBuilder()
                .maximumSize(spec.maxEntries())
                .expireAfterWrite(spec.ttlSeconds(), TimeUnit.SECONDS)
                .recordStats()
                .removalListener((key, value, cause) ->
                        log.debug("Entrada removida de {}: key={}, cause={}", cacheName, key, cause));

        Cache<Object, Object> cache = Objects.requireNonNull(caffeine.build(), "cache instance is required");
        cacheManager.registerCustomCache(cacheName, cache);
        log.debug("Caché {} configurado: maxEntries={}, ttl={}s",
                cacheName, spec.maxEntries(), spec.ttlSeconds());
    }
}
