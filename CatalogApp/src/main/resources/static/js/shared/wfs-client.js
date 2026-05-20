/**
 * LENDAS Shared WFS Client
 * Common WFS URL building and error extraction utilities
 */

'use strict';

const WfsClient = {

    /** @private Base URL for WFS proxy */
    BASE_URL: '/api/geoserver/wfs',

    /**
     * Build a WFS query URL with CQL filter
     * @param {string} typeName - WFS layer type name (e.g. 'ccmm:observation_ctd_wfs')
     * @param {Object} [filters] - Filter parameters
     * @param {Object} [filters.bbox] - Bounding box { west, south, east, north }
     * @param {string} [filters.startDate] - Start date string
     * @param {string} [filters.endDate] - End date string
     * @param {string} [filters.startDateField='result_time'] - Field name for start date filter
     * @param {string} [filters.endDateField='result_time'] - Field name for end date filter
     * @param {string} [filters.procedures] - Comma-separated procedure IDs
     * @param {string} [filters.procedureField='procedure'] - Field name for procedure filter
     * @param {string[]} [filters.extraClauses] - Additional CQL clauses
     * @returns {string} Full WFS URL
     */
    buildUrl(typeName, filters = {}) {
        const params = new URLSearchParams({ typeName });
        const clauses = [];

        // BBOX filter
        if (filters.bbox) {
            const { west, south, east, north } = filters.bbox;
            clauses.push(`BBOX(shape,${west},${south},${east},${north})`);
        }

        // Date filters
        const startField = filters.startDateField || 'result_time';
        const endField = filters.endDateField || 'result_time';

        if (filters.startDate) {
            const iso = toIsoString(filters.startDate);
            if (iso) clauses.push(`${startField}>='${iso}'`);
        }

        if (filters.endDate) {
            const iso = toIsoString(filters.endDate);
            if (iso) clauses.push(`${endField}<='${iso}'`);
        }

        // Procedure filter
        if (filters.procedures) {
            const procField = filters.procedureField || 'procedure';
            const procs = filters.procedures
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);

            if (procs.length === 1) {
                clauses.push(`${procField}=${procs[0]}`);
            } else if (procs.length > 1) {
                const inList = procs.map(v => `'${v}'`).join(',');
                clauses.push(`${procField} IN (${inList})`);
            }
        }

        // Extra clauses
        if (Array.isArray(filters.extraClauses)) {
            clauses.push(...filters.extraClauses);
        }

        if (clauses.length > 0) {
            params.append('cql_filter', clauses.join(' AND '));
        }

        return `${this.BASE_URL}?${params.toString()}`;
    },

    /**
     * Fetch WFS data with standard error handling
     * @param {string} url - WFS URL
     * @returns {Promise<Object>} Parsed GeoJSON response
     * @throws {Error} With .details property on failure
     */
    async fetchData(url) {
        try {
            return await ApiService.fetchJson(url, {
                headers: { 'Accept': 'application/json' }
            });
        } catch (error) {
            const wrappedError = new Error(error?.message || 'Error querying GeoServer');
            wrappedError.details = error?.message || null;
            throw wrappedError;
        }
    },

    /**
     * Build availability check URL
     * @param {Object} params - Parameters
     * @param {string} params.schema - Schema name
     * @param {string} params.name - Process name
     * @param {string} [params.procedures] - Process IDs
     * @param {string} [params.startTime] - Start time
     * @param {string} [params.endTime] - End time
     * @param {Object} [params.bbox] - Bounding box
     * @returns {string} Availability API URL
     */
    buildAvailabilityUrl(params) {
        const queryParams = new URLSearchParams();
        queryParams.append('schema', params.schema);
        queryParams.append('name', params.name);

        if (params.procedures) {
            queryParams.append('process-ids', params.procedures);
        }
        if (params.startTime) {
            queryParams.append('start-time', params.startTime);
        }
        if (params.endTime) {
            queryParams.append('end-time', params.endTime);
        }
        if (params.bbox) {
            queryParams.append('spatial-filter', buildBboxEwkt(params.bbox));
        }

        return `/api/catalog/check-availability?${queryParams.toString()}`;
    },

    /**
     * Fetch availability data with abort support
     * @param {Object} params - Same as buildAvailabilityUrl
     * @param {AbortSignal} [signal] - Abort signal
     * @returns {Promise<Object>} Availability data
     */
    async fetchAvailability(params, signal) {
        return ApiService.fetchJson(this.buildAvailabilityUrl(params), {
            headers: { 'Accept': 'application/json' },
            signal
        });
    }
};
