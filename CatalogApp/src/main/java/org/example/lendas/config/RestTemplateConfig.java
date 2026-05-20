package org.example.lendas.config;

import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Objects;

/**
 * Configuración de RestTemplate para la aplicación.
 * <p>
 * Proporciona beans de RestTemplate configurados con timeouts apropiados
 * para comunicación con servicios externos.
 */
@Configuration
public class RestTemplateConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(30);

    /**
     * Crea un RestTemplate con timeouts configurados.
     *
     * @return RestTemplate configurado
     */
    @Bean
    public RestTemplate restTemplate() {
        PoolingHttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                .setMaxConnTotal(50)
                .setMaxConnPerRoute(10)
                .build();

        CloseableHttpClient closeableHttpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .evictExpiredConnections()
                .build();

        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        factory.setHttpClient(Objects.requireNonNull(closeableHttpClient, "httpClient is required"));
        factory.setConnectTimeout(Objects.requireNonNull(CONNECT_TIMEOUT, "connectTimeout"));
        factory.setConnectionRequestTimeout(Objects.requireNonNull(CONNECT_TIMEOUT, "connectionRequestTimeout"));
        factory.setReadTimeout(Objects.requireNonNull(READ_TIMEOUT, "readTimeout"));
        return new RestTemplate(factory);
    }
}
