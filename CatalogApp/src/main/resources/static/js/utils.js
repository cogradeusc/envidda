/**
 * LENDAS Utilities Module
 * Shared utility functions for the LENDAS frontend
 */

'use strict';

/**
 * Humanizes API identifiers while preserving the language returned by the server.
 * Examples: data_type -> Data type, shared_feature_of_interest_type -> Shared feature of interest type
 * @param {string} value - Identifier or free text
 * @returns {string} Human-readable text
 */
function humanizeIdentifier(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const normalized = trimmed
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Formats a field label for display from either a known label or an API key.
 * @param {string} label - Label or API key
 * @returns {string}
 */
function formatDisplayLabel(label) {
    return humanizeIdentifier(label);
}

/**
 * Returns true when a string looks like a machine identifier instead of natural language.
 * @param {string} value
 * @returns {boolean}
 */
function isHumanizableIdentifier(value) {
    return typeof value === 'string'
        && /^[A-Za-z][A-Za-z0-9]*([_-][A-Za-z0-9]+)+$/.test(value.trim());
}

/**
 * Formats a value for display, handling nulls, booleans, identifiers, and objects
 * @param {*} value - The value to format
 * @returns {string} Formatted string representation
 */
function formatValue(value) {
    if (value === null || value === undefined) {
        return '—';
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    if (isHumanizableIdentifier(value)) {
        return humanizeIdentifier(value);
    }
    return String(value);
}

/**
 * Formats a datetime value to localized string
 * @param {*} value - Date value (string, number, Date)
 * @returns {string} Formatted datetime string
 */
function formatDateTime(value) {
    if (!value) {
        return '—';
    }
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString('en-US');
    } catch (error) {
        return value;
    }
}

/**
 * Normalizes datetime input for datetime-local fields
 * Converts various formats to YYYY-MM-DDTHH:MM
 * Properly handles ISO 8601 dates with Z (UTC) by converting to local time
 * @param {string} value - Input datetime string
 * @returns {string} Normalized datetime string
 */
function normalizeDateTimeInput(value) {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();

    // Handle ISO 8601 format with Z (UTC) - convert to local time
    if (trimmed.endsWith('Z') || trimmed.match(/[+-]\d{2}:\d{2}$/)) {
        const date = new Date(trimmed);
        if (!Number.isNaN(date.getTime())) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
        }
        return '';
    }

    // Already in the correct format
    if (trimmed.length === 16 && trimmed.includes('T')) {
        return trimmed;
    }

    // Extract YYYY-MM-DDTHH:MM from longer format
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (match) {
        return match[1];
    }

    // Try parsing as generic date string
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Verifies if a date string is within a valid range for historical data.
 * Rejects future dates (year >= 2026) which are likely errors.
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if date is within valid range (1990-2025)
 */
function isValidDateRange(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return false;

    const year = date.getFullYear();
    // Consider valid dates between 1990 and 2025
    // Future dates (2026+) are likely configuration errors
    return year >= 1990 && year < 2026;
}

/**
 * Formats datetime for API requests (adds seconds)
 * @param {string} value - Datetime in format YYYY-MM-DDTHH:MM
 * @returns {string} Datetime with seconds
 */
function formatDateTimeForRequest(value) {
    if (!value) {
        return value;
    }
    if (value.length === 16) {
        return `${value}:00`;
    }
    return value;
}

/**
 * Converts value to ISO string
 * @param {*} value - Date value
 * @returns {string} ISO formatted string
 */
function toIsoString(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString();
}

/**
 * Builds EWKt string from bounds object
 * @param {Object} bounds - Bounds with west, south, east, north
 * @returns {string} EWKT formatted string
 */
function buildBboxEwkt(bounds) {
    const formatCoord = (coord) => coord.toFixed(6);
    const west = formatCoord(bounds.west);
    const south = formatCoord(bounds.south);
    const east = formatCoord(bounds.east);
    const north = formatCoord(bounds.north);
    return `SRID=4326;POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
}

/**
 * Sanitizes text to prevent XSS
 * @param {string} text - Raw text input
 * @returns {string} Sanitized text
 */
function sanitize(text) {
    if (typeof text !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Extracts error detail from response text
 * @param {string} rawText - Raw error response
 * @returns {string|null} Extracted error detail or null
 */
function extractErrorDetail(rawText) {
    if (!rawText) {
        return null;
    }
    const detailMatch = rawText.match(/Detail:\s*([^\n]+)/i);
    if (detailMatch && detailMatch[1]) {
        return detailMatch[1].trim();
    }
    return null;
}
