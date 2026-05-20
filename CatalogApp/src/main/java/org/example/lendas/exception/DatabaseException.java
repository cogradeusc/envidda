package org.example.lendas.exception;

/**
 * Excepción lanzada cuando ocurre un error de acceso a la base de datos.
 * <p>
 * Esta excepción encapsula errores de persistencia como:
 * - Timeouts de consulta
 * - Errores de conexión
 * - Errores de sintaxis SQL
 * - Violaciones de restricciones
 */
public class DatabaseException extends LendasException {

    public DatabaseException(String message) {
        super("DATABASE_ERROR", message);
    }

    public DatabaseException(String message, Throwable cause) {
        super("DATABASE_ERROR", message, cause);
    }

    public DatabaseException(String message, String detail) {
        super("DATABASE_ERROR", message + ": " + detail);
    }
}
