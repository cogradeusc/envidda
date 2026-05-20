package org.example.lendas.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.lendas.config.CacheNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Controlador REST para administración de cachés.
 * <p>
 * Proporciona endpoints para:
 * <ul>
 *     <li>Listar cachés disponibles y sus estadísticas</li>
 *     <li>Invalidar cachés específicos o todos</li>
 *     <li>Consultar estadísticas de uso</li>
 * </ul>
 * <p>
 * <strong>Nota de seguridad:</strong> En producción, estos endpoints deben
 * estar protegidos con autenticación y autorización (ej: rol ADMIN).
 *
 * @see CacheNames para los nombres de caché disponibles
 * @see org.example.lendas.config.CacheConfig para la configuración
 */
@RestController
@Profile("dev")
@RequestMapping("/api/admin/cache")
@Tag(name = "Administración de Caché", description = "Operaciones de gestión y monitoreo de cachés")
public class CacheAdminController {

    private static final Logger log = LoggerFactory.getLogger(CacheAdminController.class);

    private final CacheManager cacheManager;

    public CacheAdminController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /**
     * Lista todos los cachés disponibles con sus estadísticas.
     *
     * @return lista de cachés con información básica
     */
    @Operation(
        summary = "Listar cachés",
        description = "Devuelve la lista de todos los cachés configurados con su información básica."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Lista de cachés obtenida correctamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CacheInfo.class)
            )
        )
    })
    @GetMapping
    public ResponseEntity<List<CacheInfo>> listCaches() {
        log.debug("Listando cachés disponibles");

        List<CacheInfo> caches = cacheManager.getCacheNames().stream()
                .sorted()
                .map(this::buildCacheInfo)
                .collect(Collectors.toList());

        return ResponseEntity.ok(caches);
    }

    /**
     * Obtiene información detallada de un caché específico.
     *
     * @param cacheName nombre del caché
     * @return información del caché
     */
    @Operation(
        summary = "Obtener detalle de caché",
        description = "Devuelve información detallada de un caché específico."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Detalle del caché obtenido",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CacheDetail.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Caché no encontrado")
    })
    @GetMapping("/{cacheName}")
    @SuppressWarnings("null") // Spring @NonNull en CacheManager.getCache()
    public ResponseEntity<CacheDetail> getCacheDetail(
            @Parameter(description = "Nombre del caché", example = "catalog_processTypes")
            @PathVariable String cacheName) {
        log.debug("Obteniendo detalle de caché: {}", cacheName);

        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(buildCacheDetail(cacheName, cache));
    }

    /**
     * Invalida (limpia) todos los cachés.
     *
     * @return confirmación de la operación
     */
    @Operation(
        summary = "Limpiar todos los cachés",
        description = "Invalida todas las entradas de todos los cachés. Use con precaución."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Todos los cachés han sido invalidados",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CacheOperationResult.class)
            )
        )
    })
    @PostMapping("/clear")
    @SuppressWarnings("null") // Spring @NonNull en CacheManager.getCache()
    public ResponseEntity<CacheOperationResult> clearAllCaches() {
        log.info("Invalidando todos los cachés");

        List<String> clearedCaches = new ArrayList<>();
        cacheManager.getCacheNames().forEach(name -> {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
                clearedCaches.add(name);
                log.info("Caché {} invalidado", name);
            }
        });

        return ResponseEntity.ok(new CacheOperationResult(
                "SUCCESS",
                "Todos los cachés han sido invalidados",
                clearedCaches
        ));
    }

    /**
     * Invalida (limpia) un caché específico.
     *
     * @param cacheName nombre del caché a invalidar
     * @return confirmación de la operación
     */
    @Operation(
        summary = "Limpiar caché específico",
        description = "Invalida todas las entradas de un caché específico."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Caché invalidado correctamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CacheOperationResult.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Caché no encontrado")
    })
    @PostMapping("/clear/{cacheName}")
    @SuppressWarnings("null") // Spring @NonNull en CacheManager.getCache()
    public ResponseEntity<CacheOperationResult> clearCache(
            @Parameter(description = "Nombre del caché", example = "catalog_processTypes")
            @PathVariable String cacheName) {
        log.info("Invalidando caché: {}", cacheName);

        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return ResponseEntity.notFound().build();
        }

        cache.clear();
        log.info("Caché {} invalidado exitosamente", cacheName);

        return ResponseEntity.ok(new CacheOperationResult(
                "SUCCESS",
                "Caché '" + cacheName + "' invalidado",
                Collections.singletonList(cacheName)
        ));
    }

    /**
     * Invalida una entrada específica de un caché.
     * <p>
     * Útil cuando se sabe exactamente qué clave necesita ser invalidada.
     *
     * @param cacheName nombre del caché
     * @param key       clave a invalidar
     * @return confirmación de la operación
     */
    @Operation(
        summary = "Invalidar clave específica",
        description = "Elimina una entrada específica del caché identificada por su clave."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Clave invalidada correctamente",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CacheOperationResult.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Caché no encontrado")
    })
    @PostMapping("/clear/{cacheName}/key")
    @SuppressWarnings("null") // Spring @NonNull en CacheManager.getCache()
    public ResponseEntity<CacheOperationResult> clearCacheKey(
            @Parameter(description = "Nombre del caché", example = "catalog_processTypes")
            @PathVariable String cacheName,
            @Parameter(description = "Clave a invalidar", example = "processTypes::temperature::spa")
            @RequestParam String key) {

        log.info("Invalidando clave {} del caché {}", key, cacheName);

        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return ResponseEntity.notFound().build();
        }

        String safeKey = Objects.requireNonNull(key, "Cache key must not be null");
        cache.evict(safeKey);
        log.info("Clave {} invalidada del caché {}", key, cacheName);

        return ResponseEntity.ok(new CacheOperationResult(
                "SUCCESS",
                "Clave '" + key + "' invalidada del caché '" + cacheName + "'",
                Collections.singletonList(cacheName)
        ));
    }

    @SuppressWarnings("null") // Spring @NonNull en CacheManager.getCache()
    private CacheInfo buildCacheInfo(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        String description = getCacheDescription(cacheName);
        String ttl = getCacheTtl(cacheName);

        return new CacheInfo(cacheName, description, ttl, cache != null);
    }

    private CacheDetail buildCacheDetail(String cacheName, Cache cache) {
        CacheInfo info = buildCacheInfo(cacheName);

        // Las estadísticas nativas de Caffeine requieren acceso al nativeCache
        // Esto es una simplificación - en producción se puede acceder a stats() de Caffeine
        return new CacheDetail(
                info,
                "Estadísticas disponibles vía Caffeine native cache",
                Collections.emptyMap()
        );
    }

    private String getCacheDescription(String cacheName) {
        return switch (cacheName) {
            case CacheNames.CATALOG_PROCESS_TYPES -> "Tipos de procesos del catálogo";
            case CacheNames.CATALOG_VOCABULARIES -> "Vocabularios del catálogo";
            case CacheNames.CATALOG_DATA_TYPES -> "Tipos de datos del catálogo";
            case CacheNames.CATALOG_FEATURE_TYPES -> "Tipos de features del catálogo";
            default -> "Caché de aplicación";
        };
    }

    private String getCacheTtl(String cacheName) {
        int ttlSeconds = switch (cacheName) {
            case CacheNames.CATALOG_PROCESS_TYPES -> CacheNames.TTL_PROCESS_TYPES;
            case CacheNames.CATALOG_VOCABULARIES -> CacheNames.TTL_VOCABULARIES;
            case CacheNames.CATALOG_DATA_TYPES -> CacheNames.TTL_DATA_TYPES;
            case CacheNames.CATALOG_FEATURE_TYPES -> CacheNames.TTL_FEATURE_TYPES;
            default -> 0;
        };

        if (ttlSeconds < 3600) {
            return ttlSeconds + " segundos";
        } else if (ttlSeconds < 86400) {
            return (ttlSeconds / 3600) + " horas";
        } else {
            return (ttlSeconds / 86400) + " días";
        }
    }

    // ==================== DTOs ====================

    public record CacheInfo(
            String name,
            String description,
            String ttl,
            boolean active
    ) {
    }

    public record CacheDetail(
            CacheInfo info,
            String statistics,
            Map<String, Object> metadata
    ) {
    }

    public record CacheOperationResult(
            String status,
            String message,
            List<String> affectedCaches
    ) {
    }
}
