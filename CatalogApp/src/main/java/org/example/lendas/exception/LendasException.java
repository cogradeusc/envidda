package org.example.lendas.exception;

/**
 * Excepción base para todas las excepciones de la aplicación LENDAS.
 * <p>
 * Proporciona una jerarquía de excepciones consistente y permite
 * manejar errores de forma específica en los controladores.
 */
public abstract class LendasException extends RuntimeException {

    private final String errorCode;

    protected LendasException(String message) {
        super(message);
        this.errorCode = getClass().getSimpleName();
    }

    protected LendasException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = getClass().getSimpleName();
    }

    protected LendasException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    protected LendasException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
