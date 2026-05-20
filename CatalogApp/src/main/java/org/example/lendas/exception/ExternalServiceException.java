package org.example.lendas.exception;

/**
 * Excepción lanzada cuando ocurre un error en un servicio externo.
 * <p>
 * Esta excepción se utiliza para errores de comunicación con servicios
 * externos como GeoServer, APIs de terceros, etc.
 */
public class ExternalServiceException extends LendasException {

    private final String serviceName;

    public ExternalServiceException(String serviceName, String message) {
        super("EXTERNAL_SERVICE_ERROR", "Error en servicio '" + serviceName + "': " + message);
        this.serviceName = serviceName;
    }

    public ExternalServiceException(String serviceName, String message, Throwable cause) {
        super("EXTERNAL_SERVICE_ERROR", "Error en servicio '" + serviceName + "': " + message, cause);
        this.serviceName = serviceName;
    }

    public String getServiceName() {
        return serviceName;
    }
}
