package org.example.lendas.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.Query;
import jakarta.persistence.QueryTimeoutException;
import org.example.lendas.exception.DatabaseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Supplier;

/**
 * Clase base abstracta para repositorios con manejo centralizado de excepciones.
 * <p>
 * Proporciona infraestructura común para repositorios JPA:
 * <ul>
 *     <li>Inyección de {@link EntityManager} mediante {@code @PersistenceContext}</li>
 *     <li>Métodos template para ejecución de queries con manejo de excepciones</li>
 *     <li>Logging consistente de operaciones de base de datos</li>
 * </ul>
 * <p>
 * Los repositorios concretos deben extender esta clase y utilizar los métodos
 * {@code executeQuery} para eliminar la duplicación de código try-catch.
 *
 * @param <T> tipo de entidad principal del repositorio (puede ser Void si no aplica)
 */
public abstract class AbstractRepository<T> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    protected final Logger log = LoggerFactory.getLogger(getClass());

    // EntityManager usa inyección por campo porque @PersistenceContext no soporta
    // inyección por constructor en clases abstractas. Los subclases acceden al
    // EntityManager a través de los métodos template de esta clase.
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Ejecuta una operación de query con manejo centralizado de excepciones.
     * <p>
     * Este método template elimina la necesidad de try-catch duplicados en
     * los repositorios concretos.
     *
     * @param operation descripción de la operación para logging y mensajes de error
     * @param querySupplier supplier que ejecuta el query y retorna el resultado
     * @return el resultado del query
     * @throws DatabaseException si ocurre un error de base de datos
     */
    @Transactional(readOnly = true)
    protected JsonNode executeQuery(String operation, Supplier<Object> querySupplier) {
        log.debug("Ejecutando: {}", operation);
        try {
            Object result = querySupplier.get();
            return toJsonNode(result);
        } catch (QueryTimeoutException e) {
            log.error("Timeout al ejecutar: {}", operation, e);
            throw new DatabaseException("Timeout al " + operation, e);
        } catch (PersistenceException e) {
            log.error("Error de persistencia al ejecutar: {}", operation, e);
            throw new DatabaseException("Error al " + operation, e);
        }
    }

    /**
     * Ejecuta una operación de query con contexto adicional para logging.
     *
     * @param operation descripción de la operación
     * @param context contexto adicional (ej: parámetros de la consulta)
     * @param querySupplier supplier que ejecuta el query
     * @return el resultado del query
     * @throws DatabaseException si ocurre un error de base de datos
     */
    @Transactional(readOnly = true)
    protected JsonNode executeQuery(String operation, String context, Supplier<Object> querySupplier) {
        log.debug("Ejecutando: {} - Contexto: {}", operation, context);
        try {
            Object result = querySupplier.get();
            return toJsonNode(result);
        } catch (QueryTimeoutException e) {
            log.error("Timeout al ejecutar: {} - {}", operation, context, e);
            throw new DatabaseException("Timeout al " + operation + " - " + context, e);
        } catch (PersistenceException e) {
            log.error("Error de persistencia al ejecutar: {} - {}", operation, context, e);
            throw new DatabaseException("Error al " + operation + " - " + context, e);
        }
    }

    /**
     * Ejecuta una operación de modificación (INSERT, UPDATE, DELETE) con manejo de excepciones.
     * <p>
     * Similar a {@code executeQuery} pero sin {@code @Transactional(readOnly = true)}.
     *
     * @param operation descripción de la operación
     * @param querySupplier supplier que ejecuta la operación
     * @return el número de filas afectadas
     * @throws DatabaseException si ocurre un error de base de datos
     */
    protected int executeUpdate(String operation, Supplier<Integer> querySupplier) {
        log.debug("Ejecutando actualización: {}", operation);
        try {
            return querySupplier.get();
        } catch (QueryTimeoutException e) {
            log.error("Timeout al ejecutar actualización: {}", operation, e);
            throw new DatabaseException("Timeout al " + operation, e);
        } catch (PersistenceException e) {
            log.error("Error de persistencia al ejecutar actualización: {}", operation, e);
            throw new DatabaseException("Error al " + operation, e);
        }
    }

    /**
     * Crea un query nativo con los parámetros proporcionados.
     * <p>
     * Método helper para simplificar la creación de queries parametrizados.
     *
     * @param sql el SQL nativo a ejecutar
     * @param params pares de nombre-valor de parámetros (debe haber número par de elementos)
     * @return el query configurado con sus parámetros
     */
    protected Query createNativeQuery(String sql, Object... params) {
        Query query = entityManager.createNativeQuery(sql);
        for (int i = 0; i < params.length; i += 2) {
            String paramName = (String) params[i];
            Object paramValue = params[i + 1];
            query.setParameter(paramName, paramValue);
        }
        return query;
    }

    /**
     * Ejecuta una función PostgreSQL que retorna JSON.
     * <p>
     * Método específico para el patrón común en este proyecto de llamar
     * a funciones PostgreSQL que retornan JSON.
     *
     * @param functionName nombre de la función PostgreSQL
     * @param params pares de nombre-valor de parámetros
     * @return el resultado JSON como String
     * @throws DatabaseException si ocurre un error de base de datos
     */
    @Transactional(readOnly = true)
    protected JsonNode executeJsonFunction(String functionName, Object... params) {
        String operation = "ejecutar función " + functionName;
        String context = buildParamsContext(params);

        return executeQuery(operation, context, () -> {
            StringBuilder sql = new StringBuilder("SELECT ").append(functionName).append("(");
            for (int i = 0; i < params.length; i += 2) {
                if (i > 0) sql.append(", ");
                sql.append(":").append(params[i]);
            }
            sql.append(")");

            Query query = entityManager.createNativeQuery(sql.toString());
            for (int i = 0; i < params.length; i += 2) {
                query.setParameter((String) params[i], params[i + 1]);
            }
            return query.getSingleResult();
        });
    }

    protected JsonNode emptyArray() {
        return JsonNodeFactory.instance.arrayNode();
    }

    protected JsonNode emptyObject() {
        return JsonNodeFactory.instance.objectNode();
    }

    private JsonNode toJsonNode(Object result) {
        if (result == null) {
            return JsonNodeFactory.instance.nullNode();
        }

        try {
            return OBJECT_MAPPER.readTree(result.toString());
        } catch (Exception e) {
            throw new DatabaseException("La función devolvió JSON inválido", e);
        }
    }

    /**
     * Construye un string de contexto con los nombres de parámetros.
     */
    private String buildParamsContext(Object... params) {
        if (params.length == 0) {
            return "sin parámetros";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < params.length; i += 2) {
            if (i > 0) sb.append(", ");
            sb.append(params[i]).append("=").append(params[i + 1]);
        }
        return sb.toString();
    }
}
