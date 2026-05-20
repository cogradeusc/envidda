package org.example.lendas.exception;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Representación estandarizada de un error para respuestas API.
 * <p>
 * Proporciona una estructura consistente para todos los errores de la API,
 * facilitando el manejo de errores por parte de los clientes.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String errorCode,
        String message,
        String detail,
        String path,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
        Instant timestamp
) {

    public ErrorResponse {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }

    public ErrorResponse(String errorCode, String message) {
        this(errorCode, message, null, null, Instant.now());
    }

    public ErrorResponse(String errorCode, String message, String detail) {
        this(errorCode, message, detail, null, Instant.now());
    }

    public ErrorResponse(String errorCode, String message, String detail, String path) {
        this(errorCode, message, detail, path, Instant.now());
    }
}
