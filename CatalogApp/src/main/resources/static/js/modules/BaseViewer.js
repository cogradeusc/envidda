/**
 * LENDAS BaseViewer Module
 * Abstract base class for all data visualization pages
 *
 * Usage:
 *   class MyViewer extends BaseViewer {
 *     async loadData() { ... }
 *     render() { ... }
 *   }
 *   const viewer = new MyViewer(config);
 *   await viewer.initialize();
 */

'use strict';

/**
 * Abstract base class for data visualization pages
 * Provides common functionality for loading, rendering, and error handling
 */
class BaseViewer {
    /**
     * @param {Object} config - Viewer configuration
     * @param {string} config.schema - Default schema
     * @param {string} config.name - Default process name
     * @param {string} [config.startDate] - Default start date
     * @param {string} [config.endDate] - Default end date
     * @param {string} [config.containerId='results'] - Results container ID
     * @param {string} [config.statusId='status'] - Status element ID
     */
    constructor(config = {}) {
        if (new.target === BaseViewer) {
            throw new Error('BaseViewer is abstract and cannot be instantiated directly');
        }

        this.config = {
            containerId: 'results',
            statusId: 'status',
            startDate: '2000-01-01T00:00',
            endDate: '2030-01-01T00:00',
            ...config,
        };

        this.state = {
            isLoading: false,
            error: null,
            data: null,
            schema: this.config.schema,
            name: this.config.name,
        };

        this.elements = {};
    }

    /**
     * Initialize the viewer
     * Sets up DOM references, parses URL params, and binds events
     */
    async initialize() {
        this.cacheElements();
        this.parseUrlParams();
        this.initializeDateRange();
        this.setupEventListeners();
        await this.loadData();
    }

    /**
     * Cache DOM element references
     * Override to cache additional elements
     */
    cacheElements() {
        this.elements.container = document.getElementById(this.config.containerId);
        this.elements.status = document.getElementById(this.config.statusId);
        this.elements.form = document.getElementById('search-form');
        this.elements.startDate = document.getElementById('start-date');
        this.elements.endDate = document.getElementById('end-date');
    }

    /**
     * Parse URL parameters and update state
     */
    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);

        const schemaParam = params.get('schema')?.trim();
        const nameParam = params.get('name')?.trim();
        const procedureParam = params.get('procedure')?.trim();
        const startParam = params.get('startDate');
        const endParam = params.get('endDate');

        if (schemaParam) this.state.schema = schemaParam;
        if (nameParam) this.state.name = nameParam;
        if (procedureParam) this.state.procedure = procedureParam;

        // Store in form dataset for reference
        if (this.elements.form) {
            this.elements.form.dataset.schema = this.state.schema;
            this.elements.form.dataset.name = this.state.name;
        }

        // Set date values if provided and valid
        if (startParam && this.elements.startDate) {
            const normalized = this.normalizeDateTimeInput(startParam);
            if (normalized && this.isValidDateRange(normalized)) {
                this.elements.startDate.value = normalized;
            }
        }

        if (endParam && this.elements.endDate) {
            const normalized = this.normalizeDateTimeInput(endParam);
            if (normalized && this.isValidDateRange(normalized)) {
                this.elements.endDate.value = normalized;
            }
        }
    }

    /**
     * Initialize date range inputs with defaults
     */
    initializeDateRange() {
        if (this.elements.startDate && !this.elements.startDate.value) {
            this.elements.startDate.value = this.config.startDate;
        }
        if (this.elements.endDate && !this.elements.endDate.value) {
            this.elements.endDate.value = this.config.endDate;
        }
    }

    /**
     * Set up event listeners
     * Override to add page-specific events
     */
    setupEventListeners() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }
    }

    /**
     * Handle search form submission
     * Override to customize search behavior
     */
    async handleSearch() {
        this.showLoading();
        try {
            await this.loadData();
            this.render();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load data from API
     * @abstract
     * @throws {Error} Must be implemented by subclass
     */
    async loadData() {
        throw new Error('loadData() must be implemented by subclass');
    }

    /**
     * Render the data
     * @abstract
     * @throws {Error} Must be implemented by subclass
     */
    render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.state.isLoading = true;
        this.setStatus('Loading...', 'loading');
        if (this.elements.container) {
            this.elements.container.classList.add('loading');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.state.isLoading = false;
        if (this.elements.container) {
            this.elements.container.classList.remove('loading');
        }
    }

    /**
     * Handle errors consistently
     * @param {Error} error - Error object
     * @param {string} [context] - Context where error occurred
     */
    handleError(error, context = '') {
        Logger.error(`Error${context ? ` in ${context}` : ''}:`, error);
        this.state.error = error;

        const message = error?.message || 'An unexpected error occurred';
        this.setStatus(context ? `Error: ${context}` : 'Error', 'error');

        if (window.notifications) {
            notifications.error(message);
        }

        this.renderError(message);
    }

    /**
     * Render error state
     * @param {string} message - Error message
     */
    renderError(message) {
        if (!this.elements.container) return;

        this.elements.container.innerHTML = `
            <div class="empty-state empty-state--error">
                <p>${this.escapeHtml(message)}</p>
                <button type="button" class="btn btn--primary" onclick="location.reload()">
                    Reintentar
                </button>
            </div>
        `;
    }

    /**
     * Render empty state
     * @param {string} [message='No data available'] - Message to display
     */
    renderEmptyState(message = 'No data available') {
        if (!this.elements.container) return;

        this.elements.container.innerHTML = `
            <div class="empty-state">
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    /**
     * Set status message
     * @param {string} message - Status message
     * @param {string} [type='info'] - Status type: 'info', 'success', 'error', 'loading'
     */
    setStatus(message, type = 'info') {
        if (!this.elements.status) return;

        this.elements.status.textContent = message;
        this.elements.status.className = `status status--${type}`;
    }

    /**
     * Normalize datetime input for datetime-local fields
     * @param {string} value - Input datetime string
     * @returns {string} Normalized datetime string (YYYY-MM-DDTHH:MM)
     */
    normalizeDateTimeInput(value) {
        if (!value) return '';

        const trimmed = value.trim();

        // Handle ISO 8601 format with Z (UTC) - convert to local time
        if (trimmed.endsWith('Z') || trimmed.match(/[+-]\d{2}:\d{2}$/)) {
            const date = new Date(trimmed);
            if (!Number.isNaN(date.getTime())) {
                return this.formatDateTimeLocal(date);
            }
            return '';
        }

        // Already in the correct format
        if (trimmed.length === 16 && trimmed.includes('T')) {
            return trimmed;
        }

        // Extract YYYY-MM-DDTHH:MM from longer format
        const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
        if (match) return match[1];

        // Try parsing as generic date string
        const date = new Date(trimmed);
        if (Number.isNaN(date.getTime())) return '';

        return this.formatDateTimeLocal(date);
    }

    /**
     * Format Date to datetime-local format
     * @param {Date} date - Date object
     * @returns {string} Formatted string (YYYY-MM-DDTHH:MM)
     */
    formatDateTimeLocal(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    /**
     * Verify if a date string is within a valid range
     * @param {string} dateString - Date string to validate
     * @returns {boolean} True if date is within valid range
     */
    isValidDateRange(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return false;

        const year = date.getFullYear();
        return year >= 1990 && year < 2026;
    }

    /**
     * Format datetime for API requests (adds seconds)
     * @param {string} value - Datetime in format YYYY-MM-DDTHH:MM
     * @returns {string} Datetime with seconds
     */
    formatDateTimeForRequest(value) {
        if (!value) return value;
        if (value.length === 16) return `${value}:00`;
        return value;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Raw text
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Format a value for display
     * @param {*} value - Value to format
     * @returns {string} Formatted string
     */
    formatValue(value) {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Format datetime for display
     * @param {*} value - Date value
     * @returns {string} Formatted datetime
     */
    formatDateTime(value) {
        if (!value) return '—';
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return date.toLocaleString('es-ES');
        } catch {
            return value;
        }
    }

    /**
     * Build EWKT string from bounds object
     * @param {Object} bounds - Bounds with west, south, east, north
     * @returns {string} EWKT formatted string
     */
    buildBboxEwkt(bounds) {
        const formatCoord = (coord) => coord.toFixed(6);
        const west = formatCoord(bounds.west);
        const south = formatCoord(bounds.south);
        const east = formatCoord(bounds.east);
        const north = formatCoord(bounds.north);
        return `SRID=4326;POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
    }

    /**
     * Destroy the viewer and clean up resources
     * Override to add custom cleanup
     */
    destroy() {
        // Clean up any resources
        this.state.data = null;
        this.state.error = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseViewer };
}

// Expose to global scope for browser
window.BaseViewer = BaseViewer;

