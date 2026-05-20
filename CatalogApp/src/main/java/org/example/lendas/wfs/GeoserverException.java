package org.example.lendas.wfs;

import org.example.lendas.exception.ExternalServiceException;

/**
 * Excepción específica para errores de comunicación con GeoServer.
 * <p>
 * Extiende {@link ExternalServiceException} para mantener consistencia
 * con el manejo de errores de servicios externos de la aplicación,
 * pero proporciona información adicional específica de GeoServer.
 */
public class GeoserverException extends ExternalServiceException {

    private final String operation;
    private final Integer httpStatus;

    /**
     * Crea una excepción de GeoServer con nombre de servicio específico.
     *
     * @param serviceName nombre del servicio (ej: "GeoServer WFS", "GeoServer WCS")
     * @param message mensaje descriptivo del error
     */
    public GeoserverException(String serviceName, String message) {
        super(serviceName, message);
        this.operation = null;
        this.httpStatus = null;
    }

    /**
     * Crea una excepción de GeoServer con nombre de servicio y causa.
     *
     * @param serviceName nombre del servicio
     * @param message mensaje descriptivo
     * @param cause excepción original
     */
    public GeoserverException(String serviceName, String message, Throwable cause) {
        super(serviceName, message, cause);
        this.operation = null;
        this.httpStatus = null;
    }

    /**
     * Crea una excepción de GeoServer con operación y estado HTTP.
     *
     * @param serviceName nombre del servicio
     * @param message mensaje descriptivo
     * @param operation operación que falló (ej: "GetFeature")
     * @param httpStatus código de estado HTTP
     * @param cause excepción original
     */
    public GeoserverException(String serviceName, String message, String operation,
                              Integer httpStatus, Throwable cause) {
        super(serviceName, formatMessage(message, operation, httpStatus), cause);
        this.operation = operation;
        this.httpStatus = httpStatus;
    }

    /**
     * Crea una excepción para errores de conexión.
     *
     * @param serviceName nombre del servicio (ej: SERVICE_NAME_WFS, SERVICE_NAME_WCS)
     * @param url URL a la que no se pudo conectar
     * @param cause excepción original
     */
    public static GeoserverException connectionError(String serviceName, String url, Throwable cause) {
        return new GeoserverException(
                serviceName,
                WfsConstants.ERROR_GEOSERVER_CONNECTION + ": " + url,
                null,
                null,
                cause
        );
    }

    /**
     * Crea una excepción para errores de comunicación.
     *
     * @param serviceName nombre del servicio
     * @param operation operación que falló
     * @param cause excepción original
     */
    public static GeoserverException communicationError(String serviceName, String operation,
                                                        Throwable cause) {
        return new GeoserverException(
                serviceName,
                WfsConstants.ERROR_GEOSERVER_COMMUNICATION,
                operation,
                null,
                cause
        );
    }

    /**
     * Crea una excepción para respuesta inválida.
     *
     * @param contentType Content-Type recibido
     * @param body cuerpo de la respuesta
     */
    public static GeoserverException invalidResponse(String contentType, String body) {
        String message = WfsConstants.ERROR_INVALID_RESPONSE;
        if (contentType != null) {
            message += " (Content-Type: " + contentType + ")";
        }
        return new GeoserverException(WfsConstants.SERVICE_NAME_WFS, message);
    }

    private static String formatMessage(String message, String operation, Integer httpStatus) {
        StringBuilder sb = new StringBuilder(message);
        if (operation != null) {
            sb.append(" [operación: ").append(operation).append("]");
        }
        if (httpStatus != null) {
            sb.append(" [HTTP ").append(httpStatus).append("]");
        }
        return sb.toString();
    }

    public String getOperation() {
        return operation;
    }

    public Integer getHttpStatus() {
        return httpStatus;
    }
}
