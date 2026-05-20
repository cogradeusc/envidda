package org.example.lendas.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.util.CollectionUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final SecurityProperties securityProperties;

    public WebConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        List<String> origins = securityProperties.allowedOriginPatterns();
        if (CollectionUtils.isEmpty(origins)) {
            return;
        }

        List<String> sanitizedOrigins = origins.stream()
                .filter(org.springframework.util.StringUtils::hasText)
                .collect(Collectors.toList());
        if (sanitizedOrigins.isEmpty()) {
            return;
        }

        registry.addMapping("/api/**")
                .allowedOriginPatterns(sanitizedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*");
    }
}
