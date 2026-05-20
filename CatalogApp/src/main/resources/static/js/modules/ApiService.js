/**
 * LENDAS API Service Module
 * Centralizes all API calls with consistent error handling
 *
 * Usage:
 *   const data = await ApiService.fetchProcessTypes({ filter: 'sensor', lang: 'spa' });
 *   const avail = await ApiService.fetchAvailability(schema, startTime, endTime);
 */

'use strict';

/**
 * API Service class with static methods for all API calls
 */
class ApiService {
    /**
     * Base URL for API calls
     */
    static get BASE_URL() {
        return '/api';
    }

    /**
     * Generic fetch with JSON handling and error management
     * @param {string} url - Full URL or path to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<any>} Parsed JSON response
     * @throws {Error} With descriptive message on failure
     */
    static async fetchJson(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        const response = await fetch(url, mergedOptions);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            const detail = this.extractErrorDetail(errorText);
            throw new Error(detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return null;
        }

        return response.json();
    }

    /**
     * Generic fetch for binary payloads.
     * @param {string} url
     * @param {Object} [options]
     * @returns {Promise<Response>}
     */
    static async fetchResponse(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(this.extractErrorDetail(errorText) || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }

    /**
     * Extract error detail from response text
     * @param {string} rawText - Raw error response
     * @returns {string|null} Extracted error detail
     */
    static extractErrorDetail(rawText) {
        if (!rawText) return null;

        const trimmed = rawText.trim();

        // Handle XML error responses (common in WFS/WCS)
        if (trimmed.startsWith('<')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(trimmed, 'application/xml');
                const exceptionText = doc.querySelector('ExceptionText');
                if (exceptionText?.textContent) {
                    return exceptionText.textContent;
                }
                return doc.documentElement.textContent || trimmed;
            } catch {
                return trimmed;
            }
        }

        // Handle Detail: prefix
        const detailMatch = trimmed.match(/Detail:\s*([^\n]+)/i);
        if (detailMatch?.[1]) {
            return detailMatch[1].trim();
        }

        return trimmed;
    }

    /**
     * Fetch process types with optional filtering
     * @param {Object} params - Query parameters
     * @param {string} [params.filter] - Text filter
     * @param {string} [params.lang] - Language code
     * @returns {Promise<Array>} Process types array
     */
    static async fetchProcessTypes(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.filter) queryParams.append('filter', params.filter);
        if (params.lang) queryParams.append('lang', params.lang);

        const query = queryParams.toString();
        const url = `${this.BASE_URL}/catalog/process-types${query ? `?${query}` : ''}`;

        return this.fetchJson(url);
    }

    /**
     * Fetch filtered process types with criteria
     * @param {Object} params - Filter parameters
     * @param {string} [params.keyword] - Keyword filter
     * @param {string} [params.startTime] - Start time filter
     * @param {string} [params.endTime] - End time filter
     * @returns {Promise<Array>} Filtered process types
     */
    static async fetchFilteredProcessTypes(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.schema) queryParams.append('schema', params.schema);
        if (params.name) queryParams.append('name', params.name);
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.startTime) queryParams.append('start-time', params.startTime);
        if (params.endTime) queryParams.append('end-time', params.endTime);

        const url = `${this.BASE_URL}/catalog/filter-process-types?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch single process type by ID
     * @param {string} id - Process type ID (schema.name)
     * @param {Object} params - Optional parameters
     * @param {string} [params.startTime] - Start time filter
     * @param {string} [params.endTime] - End time filter
     * @returns {Promise<Object>} Process type data
     */
    static async fetchProcessType(params = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('schema', params.schema);
        queryParams.append('name', params.name);
        queryParams.append('id', params.id);
        if (params.startTime) queryParams.append('start-time', params.startTime);
        if (params.endTime) queryParams.append('end-time', params.endTime);

        const url = `${this.BASE_URL}/catalog/process-type?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch data availability for process/feature combinations
     * @param {string} schema - Schema name
     * @param {string} startTime - Start time (ISO format)
     * @param {string} endTime - End time (ISO format)
     * @param {Object} options - Additional options
     * @param {string} [options.name] - Process name
     * @param {string} [options.procedure] - Procedure filter
     * @param {string} [options.spatialFilter] - Spatial filter (EWKT)
     * @returns {Promise<Object>} Availability data
     */
    static async fetchAvailability(schema, startTime, endTime, options = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('schema', schema);
        if (options.name) queryParams.append('name', options.name);
        queryParams.append('start-time', startTime);
        queryParams.append('end-time', endTime);
        if (options.processIds || options.procedure) queryParams.append('process-ids', options.processIds || options.procedure);
        if (options.featureIds) queryParams.append('feature-ids', options.featureIds);
        if (options.spatialFilter) queryParams.append('spatial-filter', options.spatialFilter);

        const url = `${this.BASE_URL}/catalog/check-availability?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    static async fetchFeatureOfInterest(schema, name, id, options = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('schema', schema);
        queryParams.append('name', name);
        queryParams.append('id', id);
        if (options.startTime) queryParams.append('start-time', options.startTime);
        if (options.endTime) queryParams.append('end-time', options.endTime);
        return this.fetchJson(`${this.BASE_URL}/catalog/feature-of-interest?${queryParams.toString()}`);
    }

    /**
     * Fetch feature type definition
     * @param {string} schema - Schema name
     * @param {string} name - Feature type name
     * @returns {Promise<Object>} Feature type data
     */
    static async fetchFeatureType(schema, name) {
        const url = `${this.BASE_URL}/catalog/feature-type?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch filtered features of interest with optional spatial filter
     * @param {string} schema - Schema name
     * @param {string} name - Feature type name
     * @param {Object} options - Filter options
     * @param {string} [options.spatialFilter] - Spatial filter (EWKT polygon)
     * @returns {Promise<Object>} Filtered features
     */
    static async fetchFilteredFeatures(schema, name, options = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('schema', schema);
        queryParams.append('name', name);
        if (options.spatialFilter) {
            queryParams.append('spatial-filter', options.spatialFilter);
        }

        const url = `${this.BASE_URL}/catalog/filter-feature-of-interest?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch vocabulary definition
     * @param {string} schema - Schema name
     * @param {string} name - Vocabulary name
     * @returns {Promise<Object>} Vocabulary data
     */
    static async fetchVocabulary(schema, name) {
        const url = `${this.BASE_URL}/catalog/vocabulary?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch data type definition
     * @param {string} schema - Schema name
     * @param {string} name - Data type name
     * @returns {Promise<Object>} Data type data
     */
    static async fetchDataType(schema, name) {
        const url = `${this.BASE_URL}/catalog/data-type?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch WFS features from GeoServer
     * @param {string} typeName - Layer type name (schema:layer)
     * @param {Object} params - WFS parameters
     * @param {string} [params.cqlFilter] - CQL filter
     * @param {string} [params.bbox] - Bounding box
     * @param {number} [params.maxFeatures] - Max features to return
     * @param {string} [params.outputFormat] - Output format
     * @returns {Promise<Object>} GeoJSON features
     */
    static async fetchWFSFeatures(typeName, params = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('service', 'WFS');
        queryParams.append('version', '1.0.0');
        queryParams.append('request', 'GetFeature');
        queryParams.append('typeName', typeName);
        queryParams.append('outputFormat', params.outputFormat || 'application/json');
        if (params.cqlFilter) queryParams.append('cql_filter', params.cqlFilter);
        if (params.bbox) queryParams.append('bbox', params.bbox);
        if (params.maxFeatures) queryParams.append('maxFeatures', params.maxFeatures.toString());

        const url = `${this.BASE_URL}/geoserver/wfs?${queryParams.toString()}`;
        return this.fetchJson(url);
    }

    /**
     * Fetch WCS layer coverage
     * @param {string} layer - Layer name
     * @param {Object} params - WCS parameters
     * @param {string} params.bbox - Bounding box (minX,minY,maxX,maxY)
     * @param {string} params.time - Time parameter
     * @param {string} [params.elevation] - Elevation/depth parameter
     * @param {number} [params.width] - Output width
     * @param {number} [params.height] - Output height
     * @returns {Promise<Blob>} Coverage as image blob
     */
    static async fetchWCSLayer(layer, params) {
        const queryParams = new URLSearchParams();
        queryParams.append('service', 'WCS');
        queryParams.append('version', '2.0.1');
        queryParams.append('request', 'GetCoverage');
        queryParams.append('coverageId', layer);
        queryParams.append('format', 'image/tiff');

        if (params.bbox) queryParams.append('subset', `Long(${params.bbox.split(',')[0]},${params.bbox.split(',')[2]})`);
        if (params.bbox) queryParams.append('subset', `Lat(${params.bbox.split(',')[1]},${params.bbox.split(',')[3]})`);
        if (params.time) queryParams.append('subset', `time("${params.time}")`);
        if (params.elevation) queryParams.append('subset', `elevation(${params.elevation})`);

        const url = `${this.BASE_URL}/geoserver/wcs?${queryParams.toString()}`;

        const response = await this.fetchResponse(url);
        return response.blob();
    }

    /**
     * Fetch WMS map image
     * @param {string} layer - Layer name
     * @param {Object} params - WMS parameters
     * @param {string} params.bbox - Bounding box
     * @param {number} params.width - Image width
     * @param {number} params.height - Image height
     * @param {string} [params.time] - Time parameter
     * @param {string} [params.elevation] - Elevation parameter
     * @param {string} [params.styles] - Styles parameter
     * @returns {Promise<string>} Image URL
     */
    static async fetchWMSLayer(layer, params) {
        const queryParams = new URLSearchParams();
        queryParams.append('service', 'WMS');
        queryParams.append('version', '1.1.0');
        queryParams.append('request', 'GetMap');
        queryParams.append('layers', layer);
        queryParams.append('styles', params.styles || '');
        queryParams.append('format', 'image/png');
        queryParams.append('transparent', 'true');
        queryParams.append('width', (params.width || 512).toString());
        queryParams.append('height', (params.height || 512).toString());
        queryParams.append('bbox', params.bbox);
        queryParams.append('srs', 'EPSG:4326');

        if (params.time) queryParams.append('time', params.time);
        if (params.elevation) queryParams.append('elevation', params.elevation);

        return `${this.BASE_URL}/geoserver/wms?${queryParams.toString()}`;
    }

    /**
     * Clear all caches (admin endpoint)
     * @returns {Promise<Object>}
     */
    static async clearAllCaches() {
        const url = `${this.BASE_URL}/admin/cache/clear`;
        return this.fetchJson(url, { method: 'POST' });
    }

    /**
     * Clear specific cache (admin endpoint)
     * @param {string} cacheName - Name of cache to clear
     * @returns {Promise<Object>}
     */
    static async clearCache(cacheName) {
        const url = `${this.BASE_URL}/admin/cache/clear/${encodeURIComponent(cacheName)}`;
        return this.fetchJson(url, { method: 'POST' });
    }

    /**
     * List all caches (admin endpoint)
     * @returns {Promise<Object>}
     */
    static async listCaches() {
        const url = `${this.BASE_URL}/admin/cache`;
        return this.fetchJson(url);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService };
}

// Expose to global scope for browser
window.ApiService = ApiService;
