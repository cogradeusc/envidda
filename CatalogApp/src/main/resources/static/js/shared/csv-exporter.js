/**
 * LENDAS CSV Exporter Module
 * Shared utility for exporting GeoJSON/feature data to CSV format
 */

'use strict';

const CsvExporter = {

    /**
     * Export GeoJSON features to CSV file
     * @param {Object[]} features - Array of GeoJSON features
     * @param {string} filename - Base filename (without extension)
     * @param {Object} [options] - Export options
     * @param {string[]} [options.includeFields] - Fields to include (if empty, all fields)
     * @param {string[]} [options.excludeFields] - Fields to exclude
     * @param {Object} [options.fieldLabels] - Map of field names to display labels
     */
    exportFeatures(features, filename, options = {}) {
        if (!features || !Array.isArray(features) || features.length === 0) {
            Logger.warn('No features to export');
            notifications.warning('There is no data to export');
            return;
        }

        try {
            const csvContent = this.convertToCsv(features, options);
            this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
            notifications.success(`Exportados ${features.length} registros a CSV`);
        } catch (error) {
            Logger.error('Error exporting to CSV:', error);
            notifications.error('Error exporting data');
        }
    },

    /**
     * Convert GeoJSON features to CSV string
     * @param {Object[]} features - Array of GeoJSON features
     * @param {Object} [options] - Export options
     * @param {string[]} [options.fieldOrder] - Fields to place first in specified order
     * @returns {string} CSV content
     */
    convertToCsv(features, options = {}) {
        const { includeFields = [], excludeFields = [], fieldLabels = {}, fieldOrder = [] } = options;

        // Collect all unique property keys from all features
        const allKeys = new Set();
        features.forEach(feature => {
            const props = feature?.properties || {};
            Object.keys(props).forEach(key => allKeys.add(key));
        });

        // Filter keys based on include/exclude options
        let keys = Array.from(allKeys);
        if (includeFields.length > 0) {
            keys = keys.filter(key => includeFields.includes(key));
        }
        if (excludeFields.length > 0) {
            keys = keys.filter(key => !excludeFields.includes(key));
        }

        // Sort keys: first by fieldOrder, then alphabetically for remaining
        keys.sort((a, b) => {
            const indexA = fieldOrder.indexOf(a);
            const indexB = fieldOrder.indexOf(b);

            // Both fields are in fieldOrder
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // Only a is in fieldOrder
            if (indexA !== -1) return -1;
            // Only b is in fieldOrder
            if (indexB !== -1) return 1;
            // Neither is in fieldOrder, sort alphabetically
            return a.localeCompare(b);
        });

        // Build CSV rows
        const rows = [];

        // Header row with labels
        const headerRow = keys.map(key => {
            const label = fieldLabels[key] || key;
            return this.escapeCsvField(label);
        });
        rows.push(headerRow.join(','));

        // Data rows
        features.forEach(feature => {
            const props = feature?.properties || {};
            const row = keys.map(key => {
                const value = props[key];
                return this.formatValueForCsv(value);
            });
            rows.push(row.join(','));
        });

        // Add BOM for Excel compatibility
        return '\uFEFF' + rows.join('\n');
    },

    /**
     * Format a value for CSV output
     * @param {*} value - The value to format
     * @returns {string} Formatted CSV field
     */
    formatValueForCsv(value) {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'object') {
            // Handle dates
            if (value instanceof Date) {
                return this.escapeCsvField(value.toISOString());
            }
            // Handle arrays and objects
            return this.escapeCsvField(JSON.stringify(value));
        }

        return this.escapeCsvField(String(value));
    },

    /**
     * Escape a field for CSV if necessary
     * @param {string} field - The field value
     * @returns {string} Escaped field
     */
    escapeCsvField(field) {
        if (!field) return '';

        // Escape quotes by doubling them
        let escaped = field.replace(/"/g, '""');

        // Wrap in quotes if contains comma, newline, or quote
        if (/[,\n\r"]/.test(escaped)) {
            escaped = `"${escaped}"`;
        }

        return escaped;
    },

    /**
     * Trigger file download
     * @param {string} content - File content
     * @param {string} filename - Filename with extension
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    },

    /**
     * Create export button element
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement} The button element
     */
    createButton(onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chart-control-btn chart-control-btn--secondary';
        button.innerHTML = '<span class="btn-icon">📊</span> Export to CSV';
        button.addEventListener('click', onClick);
        return button;
    }
};

