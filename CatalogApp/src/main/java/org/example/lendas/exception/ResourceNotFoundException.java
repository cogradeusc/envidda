package org.example.lendas.exception;

/**
 * Excepción lanzada cuando un recurso solicitado no existe.
 * <p>
 * Esta excepción se utiliza cuando se solicita un recurso específico
 * (proceso, tipo de dato, vocabulario, etc.) que no se encuentra en
 * la base de datos.
 */
public class ResourceNotFoundException extends LendasException {

    private final String resourceType;
    private final String resourceId;

    public ResourceNotFoundException(String resourceType, String resourceId) {
        super("NOT_FOUND", resourceType + " no encontrado: " + resourceId);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public ResourceNotFoundException(String resourceType, String resourceId, String detail) {
        super("NOT_FOUND", resourceType + " no encontrado: " + resourceId + " - " + detail);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }
}
