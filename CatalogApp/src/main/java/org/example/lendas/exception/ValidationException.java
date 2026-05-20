package org.example.lendas.exception;

/**
 * Excepción lanzada cuando los parámetros de entrada no son válidos.
 * <p>
 * Esta excepción se utiliza para errores de validación de datos de entrada,
 * como parámetros faltantes, formatos incorrectos o valores fuera de rango.
 */
public class ValidationException extends LendasException {

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message);
    }

    public ValidationException(String message, Throwable cause) {
        super("VALIDATION_ERROR", message, cause);
    }
}
