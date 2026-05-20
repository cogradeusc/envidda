package org.example.lendas.wfs;

/**
 * Constantes específicas para operaciones WFS (Web Feature Service) y WCS (Web Coverage Service).
 * <p>
 * Esta clase centraliza todas las constantes relacionadas con GeoServer,
 * eliminando la dispersión de valores literales y proporcionando
 * un único punto de verdad para configuración de servicios geoespaciales.
 */
public final class WfsConstants {

    private WfsConstants() {
        throw new AssertionError("Cannot instantiate constants class");
    }

    // ============================================
    // Servicios y Versiones
    // ============================================
    public static final String SERVICE_WFS = "WFS";
    public static final String SERVICE_WCS = "WCS";
    public static final String VERSION_1_0_0 = "1.0.0";
    public static final String VERSION_2_0_1 = "2.0.1";

    // ============================================
    // Operaciones WFS
    // ============================================
    public static final String REQUEST_GET_FEATURE = "GetFeature";
    public static final String REQUEST_GET_CAPABILITIES = "GetCapabilities";
    public static final String REQUEST_DESCRIBE_FEATURE_TYPE = "DescribeFeatureType";

    // ============================================
    // Operaciones WCS
    // ============================================
    public static final String REQUEST_GET_COVERAGE = "GetCoverage";
    public static final String REQUEST_DESCRIBE_COVERAGE = "DescribeCoverage";
    public static final String REQUEST_GET_CAPABILITIES_WCS = "GetCapabilities";

    // ============================================
    // Formatos de Salida
    // ============================================
    public static final String OUTPUT_FORMAT_JSON = "application/json";
    public static final String OUTPUT_FORMAT_XML = "application/xml";
    public static final String OUTPUT_FORMAT_GEOTIFF = "image/tiff";
    public static final String OUTPUT_FORMAT_GML2 = "GML2";
    public static final String OUTPUT_FORMAT_GML3 = "GML3";

    // ============================================
    // Valores por Defecto
    // ============================================
    public static final String DEFAULT_TYPENAME = "ccmm:observation_configuracion_ctd_wfs";
    public static final int DEFAULT_MAX_FEATURES = 1000;
    public static final int MIN_MAX_FEATURES = 1;
    public static final int MAX_MAX_FEATURES = 10000;

    // ============================================
    // Parámetros de Query
    // ============================================
    public static final String PARAM_SERVICE = "service";
    public static final String PARAM_VERSION = "version";
    public static final String PARAM_REQUEST = "request";
    public static final String PARAM_TYPENAME = "typeName";
    public static final String PARAM_CQL_FILTER = "cql_filter";
    public static final String PARAM_BBOX = "bbox";
    public static final String PARAM_MAX_FEATURES = "maxFeatures";
    public static final String PARAM_OUTPUT_FORMAT = "outputFormat";
    public static final String PARAM_COVERAGE_ID = "coverageId";
    public static final String PARAM_SUBSET = "subset";
    public static final String PARAM_SUBSETTING_CRS = "subsettingCrs";

    // ============================================
    // WCS 2.0.1 Subset Dimensions
    // ============================================
    public static final String SUBSET_LONG = "Long";
    public static final String SUBSET_LAT = "Lat";
    public static final String CRS_EPSG_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326";

    // ============================================
    // Codificación URI
    // ============================================
    public static final String ENCODING_LEFT_PAREN = "%28";
    public static final String ENCODING_RIGHT_PAREN = "%29";

    // ============================================
    // BBOX Format
    // ============================================
    public static final String BBOX_SEPARATOR = ",";
    public static final int BBOX_COORDINATE_COUNT = 4;
    public static final int BBOX_INDEX_MIN_LON = 0;
    public static final int BBOX_INDEX_MIN_LAT = 1;
    public static final int BBOX_INDEX_MAX_LON = 2;
    public static final int BBOX_INDEX_MAX_LAT = 3;

    // ============================================
    // Mensajes de Error
    // ============================================
    public static final String ERROR_INVALID_BBOX_FORMAT = "Formato de BBOX inválido. Use: minLon,minLat,maxLon,maxLat";
    public static final String ERROR_INVALID_BBOX_COORDINATES = "Coordenadas de BBOX inválidas: min debe ser menor que max";
    public static final String ERROR_INVALID_MAX_FEATURES = "maxFeatures debe estar entre %d y %d";
    public static final String ERROR_EMPTY_TYPENAME = "typeName no puede estar vacío";
    public static final String ERROR_GEOSERVER_CONNECTION = "No se puede conectar a GeoServer";
    public static final String ERROR_GEOSERVER_COMMUNICATION = "Error en comunicación con GeoServer";
    public static final String ERROR_INVALID_RESPONSE = "Respuesta inesperada del servicio (no JSON)";

    // ============================================
    // Nombres de Servicios
    // ============================================
    public static final String SERVICE_NAME_WFS = "GeoServer WFS";
    public static final String SERVICE_NAME_WCS = "GeoServer WCS";
}
