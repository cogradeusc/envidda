/**
 * LENDAS Security Module
 * XSS prevention and input validation utilities
 */

'use strict';

/**
 * Security utilities for sanitization and validation
 */
const Security = {
    /**
     * HTML entity map for sanitization
     * @private
     */
    _htmlEscapes: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    },

    /**
     * Regular expression for matching HTML entities
     * @private
     */
    _htmlEscaper: /[&<>"'`=/]/g,

    /**
     * Sanitizes text to prevent XSS attacks
     * Escapes HTML special characters
     * @param {*} value - Value to sanitize
     * @returns {string} Sanitized string safe for HTML insertion
     */
    escapeHtml(value) {
        if (value == null) {
            return '';
        }
        const str = String(value);
        return str.replace(this._htmlEscaper, (match) => this._htmlEscapes[match]);
    },

    /**
     * Sanitizes a string for use in HTML attributes
     * @param {*} value - Value to sanitize
     * @returns {string} Sanitized string safe for attributes
     */
    escapeAttr(value) {
        if (value == null) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Sanitizes a string for use in JavaScript contexts
     * @param {*} value - Value to sanitize
     * @returns {string} Sanitized string safe for JS
     */
    escapeJs(value) {
        if (value == null) {
            return '';
        }
        return JSON.stringify(String(value));
    },

    /**
     * Sanitizes URL to prevent javascript: protocol attacks
     * @param {string} url - URL to sanitize
     * @returns {string} Safe URL or empty string if unsafe
     */
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }
        const trimmed = url.trim().toLowerCase();
        // Block dangerous protocols
        if (trimmed.startsWith('javascript:') ||
            trimmed.startsWith('data:') ||
            trimmed.startsWith('vbscript:') ||
            trimmed.startsWith('file:')) {
            return '';
        }
        return url;
    },

    /**
     * Creates a safe HTML string from a template
     * All interpolated values are automatically escaped
     * @param {string[]} strings - Template strings
     * @param {...*} values - Values to interpolate
     * @returns {string} Safe HTML string
     */
    html(strings, ...values) {
        return strings.reduce((result, string, i) => {
            const value = values[i];
            if (value != null) {
                return result + string + this.escapeHtml(value);
            }
            return result + string;
        }, '');
    },

    /**
     * Validates and sanitizes user input
     * @param {*} value - Input value
     * @param {Object} options - Validation options
     * @param {string} [options.type='string'] - Expected type
     * @param {number} [options.maxLength] - Maximum length
     * @param {RegExp} [options.pattern] - Validation pattern
     * @param {*} [options.defaultValue=''] - Default if invalid
     * @returns {*} Sanitized and validated value
     */
    validateInput(value, options = {}) {
        const {
            type = 'string',
            maxLength = 1000,
            pattern = null,
            defaultValue = ''
        } = options;

        // Handle null/undefined
        if (value == null) {
            return defaultValue;
        }

        let sanitized = value;

        // Type validation and conversion
        switch (type) {
            case 'string':
                sanitized = String(value).trim();
                break;
            case 'number':
                sanitized = Number(value);
                if (Number.isNaN(sanitized)) {
                    return defaultValue;
                }
                break;
            case 'integer':
                sanitized = parseInt(value, 10);
                if (Number.isNaN(sanitized)) {
                    return defaultValue;
                }
                break;
            case 'boolean':
                sanitized = Boolean(value);
                break;
            case 'date': {
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                    return defaultValue;
                }
                sanitized = date;
                break;
            }
            case 'array':
                if (!Array.isArray(value)) {
                    return defaultValue;
                }
                break;
            default:
                sanitized = String(value).trim();
        }

        // Length validation for strings
        if (type === 'string' && maxLength > 0 && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        // Pattern validation
        if (pattern && type === 'string' && !pattern.test(sanitized)) {
            return defaultValue;
        }

        return sanitized;
    },

    /**
     * Validates a bounding box object
     * @param {*} bbox - Bounding box object
     * @returns {Object|null} Valid bbox or null
     */
    validateBoundingBox(bbox) {
        if (!bbox || typeof bbox !== 'object') {
            return null;
        }

        const { north, south, east, west } = bbox;

        // Validate all coordinates are numbers
        const coords = [north, south, east, west];
        if (coords.some(c => typeof c !== 'number' || Number.isNaN(c))) {
            return null;
        }

        // Validate coordinate ranges
        if (north < -90 || north > 90 || south < -90 || south > 90) {
            return null;
        }
        if (east < -180 || east > 180 || west < -180 || west > 180) {
            return null;
        }

        // Validate north > south
        if (north <= south) {
            return null;
        }

        return { north, south, east, west };
    },

    /**
     * Validates date range
     * @param {string|Date} startDate - Start date
     * @param {string|Date} endDate - End date
     * @param {Object} options - Validation options
     * @param {Date} [options.minDate] - Minimum allowed date
     * @param {Date} [options.maxDate] - Maximum allowed date
     * @returns {Object|null} Valid date range or null
     */
    validateDateRange(startDate, endDate, options = {}) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return null;
        }

        if (start > end) {
            return null;
        }

        const { minDate, maxDate } = options;

        if (minDate && start < minDate) {
            return null;
        }
        if (maxDate && end > maxDate) {
            return null;
        }

        return { start, end };
    },

    /**
     * Validates a process ID string
     * @param {string} value - Process ID(s)
     * @returns {number[]|null} Array of valid IDs or null
     */
    validateProcessIds(value) {
        if (!value || typeof value !== 'string') {
            return null;
        }

        const ids = value.split(/[,\s]+/)
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !Number.isNaN(n) && n > 0);

        if (ids.length === 0) {
            return null;
        }

        // Remove duplicates
        return [...new Set(ids)];
    },

    /**
     * Creates a safe DOM element with text content
     * @param {string} tag - HTML tag name
     * @param {string} text - Text content
     * @param {Object} [attributes] - Safe attributes
     * @returns {HTMLElement} Created element
     */
    createSafeElement(tag, text, attributes = {}) {
        const element = document.createElement(tag);
        element.textContent = text;

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'href') {
                element.setAttribute(key, this.sanitizeUrl(value));
            } else {
                element.setAttribute(key, this.escapeAttr(value));
            }
        });

        return element;
    },

    /**
     * Safely sets innerHTML only when content is trusted
     * Use setSafeTextContent for user-generated content
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML content (should be from trusted source)
     */
    setSafeHtml(element, html) {
        if (!element) return;
        // Only use for static/trusted HTML
        element.innerHTML = html;
    },

    /**
     * Safely sets text content (preferred over innerHTML for dynamic content)
     * @param {HTMLElement} element - Target element
     * @param {*} text - Text content
     */
    setSafeTextContent(element, text) {
        if (!element) return;
        element.textContent = text == null ? '' : String(text);
    },

    /**
     * Deep sanitizes an object by escaping all string values
     * @param {*} obj - Object to sanitize
     * @returns {*} Sanitized object
     */
    deepSanitize(obj) {
        if (obj == null) {
            return obj;
        }

        if (typeof obj === 'string') {
            return this.escapeHtml(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSanitize(item));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            Object.entries(obj).forEach(([key, value]) => {
                sanitized[key] = this.deepSanitize(value);
            });
            return sanitized;
        }

        return obj;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Security };
}

// Expose to global scope for browser
window.Security = Security;
