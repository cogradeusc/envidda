package org.example.lendas.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración de OpenAPI/Swagger para la documentación de la API.
 *
 * <p>Esta clase configura la información general de la API que se muestra
 * en la interfaz de Swagger UI y en la especificación OpenAPI.
 *
 * @author LENDAS Team
 * @see <a href="http://localhost:8080/swagger-ui.html">Swagger UI</a>
 * @see <a href="http://localhost:8080/v3/api-docs">OpenAPI Spec</a>
 */
@Configuration
public class OpenApiConfig {

    /**
     * Crea y configura el bean de OpenAPI con la información de la API.
     *
     * @param appVersion versión de la aplicación desde application.properties
     * @return objeto OpenAPI configurado
     */
    @Bean
    public OpenAPI customOpenAPI(@Value("${spring.application.version:0.0.1}") String appVersion) {
        return new OpenAPI()
            .info(new Info()
                .title("LENDAS API")
                .version(appVersion)
                .description("API REST para la gestión de catálogos de datos científicos y oceanográficos. " +
                    "Proporciona acceso a metadatos de procesos, tipos de datos, vocabularios controlados " +
                    "y verificación de disponibilidad de datos. Integra con GeoServer para servicios WFS y WCS.")
                .contact(new Contact()
                    .name("LENDAS Team")
                    .email("support@lendas.example.org")
                    .url("https://github.com/lendas/api"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("/")
                    .description("Servidor actual"),
                new Server()
                    .url("http://localhost:8080")
                    .description("Servidor de desarrollo local")
            ));
    }
}
