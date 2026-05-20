/**
 * LENDAS ChartModal Module
 * Unified Highcharts modal management
 *
 * Usage:
 *   const chartModal = new ChartModal('chart-modal', {
 *     title: 'Chart Title',
 *     yAxisLabel: 'Value (units)'
 *   });
 *   chartModal.open({ series: [...], categories: [...] });
 */

'use strict';

/**
 * Chart modal manager for Highcharts visualizations
 */
class ChartModal {
    /**
     * @param {string} modalId - Base ID for modal elements
     * @param {Object} options - Configuration options
     * @param {string} [options.title='Chart'] - Default chart title
     * @param {string} [options.yAxisLabel='Value'] - Y-axis label
     * @param {string} [options.xAxisLabel=''] - X-axis label
     * @param {string} [options.type='line'] - Chart type (line, scatter, column)
     * @param {boolean} [options.enableExport=false] - Enable export menu
     * @param {Function} [options.onClose] - Callback when modal closes
     */
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.options = {
            title: 'Chart',
            yAxisLabel: 'Value',
            xAxisLabel: '',
            type: 'line',
            enableExport: false,
            ...options
        };

        this.elements = {};
        this.chart = null;
        this.isOpen = false;
        this.eventListeners = [];

        this.cacheElements();
        this.bindEvents();
    }

    /**
     * Track an event listener for later cleanup
     * @private
     */
    _trackListener(element, event, handler) {
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Remove all tracked event listeners
     * @private
     */
    _removeAllListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    /**
     * Cache DOM element references
     */
    cacheElements() {
        this.elements.modal = document.getElementById(this.modalId);
        this.elements.title = document.getElementById(`${this.modalId}-title`);
        this.elements.chart = document.getElementById(`${this.modalId}-chart`);
        this.elements.backdrop = this.elements.modal?.querySelector('[data-modal-dismiss]');
        this.elements.closeBtn = this.elements.modal?.querySelector('.modal__close');
        this.elements.loading = document.getElementById(`${this.modalId}-loading`);
        this.elements.error = document.getElementById(`${this.modalId}-error`);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements.modal) return;

        // Close on backdrop click
        const backdropHandler = () => this.close();
        this.elements.backdrop?.addEventListener('click', backdropHandler);
        this._trackListener(this.elements.backdrop, 'click', backdropHandler);

        // Close on close button click
        const closeBtnHandler = () => this.close();
        this.elements.closeBtn?.addEventListener('click', closeBtnHandler);
        this._trackListener(this.elements.closeBtn, 'click', closeBtnHandler);

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        this._trackListener(document, 'keydown', escapeHandler);

        // Handle window resize
        const resizeHandler = this.debounce(() => {
            if (this.chart) {
                this.chart.reflow();
            }
        }, 250);
        window.addEventListener('resize', resizeHandler);
        this._trackListener(window, 'resize', resizeHandler);
    }

    /**
     * Open the modal with chart configuration
     * @param {Object} config - Chart configuration
     * @param {Array} config.series - Chart series data
     * @param {Array} [config.categories] - X-axis categories
     * @param {string} [config.title] - Chart title (overrides default)
     * @param {string} [config.yAxisLabel] - Y-axis label (overrides default)
     * @param {string} [config.xAxisLabel] - X-axis label (overrides default)
     * @param {string} [config.type] - Chart type (overrides default)
     * @param {Object} [config.additionalOptions] - Additional Highcharts options
     */
    open(config = {}) {
        if (!this.elements.modal) {
            Logger.error(`Modal #${this.modalId} not found`);
            return;
        }

        this.isOpen = true;
        this.elements.modal.hidden = false;
        document.body.classList.add('modal-open');

        // Update title
        const title = config.title || this.options.title;
        if (this.elements.title) {
            this.elements.title.textContent = title;
        }

        // Show loading state
        this.showLoading();

        // Create chart after a short delay to allow modal to render
        setTimeout(() => {
            this.createChart(config);
        }, 100);

        // Focus management
        this.elements.closeBtn?.focus();
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;

        if (this.elements.modal) {
            this.elements.modal.hidden = true;
        }

        document.body.classList.remove('modal-open');

        // Destroy chart to free memory
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Clear content
        if (this.elements.chart) {
            this.elements.chart.innerHTML = '';
        }

        // Trigger callback
        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.loading) {
            this.elements.loading.hidden = false;
        }
        if (this.elements.chart) {
            this.elements.chart.style.opacity = '0.3';
        }
        if (this.elements.error) {
            this.elements.error.hidden = true;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.hidden = true;
        }
        if (this.elements.chart) {
            this.elements.chart.style.opacity = '1';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideLoading();

        if (this.elements.error) {
            this.elements.error.textContent = message;
            this.elements.error.hidden = false;
        }

        if (this.elements.chart) {
            this.elements.chart.style.opacity = '0.3';
        }
    }

    /**
     * Create Highcharts instance
     * @param {Object} config - Chart configuration
     */
    createChart(config) {
        if (!this.elements.chart || typeof Highcharts === 'undefined') {
            this.showError('Chart library not available');
            return;
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const chartType = config.type || this.options.type;
        const yAxisLabel = config.yAxisLabel || this.options.yAxisLabel;
        const xAxisLabel = config.xAxisLabel || this.options.xAxisLabel;

        const baseOptions = {
            chart: {
                type: chartType,
                backgroundColor: 'transparent',
                style: {
                    fontFamily: 'inherit'
                }
            },
            title: {
                text: null
            },
            xAxis: {
                title: {
                    text: xAxisLabel,
                    style: { fontWeight: 'bold' }
                },
                categories: config.categories || null,
                labels: {
                    rotation: config.categories?.length > 10 ? -45 : 0
                }
            },
            yAxis: {
                title: {
                    text: yAxisLabel,
                    style: { fontWeight: 'bold' }
                },
                labels: {
                    format: '{value}'
                }
            },
            legend: {
                enabled: config.series?.length > 1
            },
            plotOptions: {
                line: {
                    marker: {
                        enabled: config.series?.[0]?.data?.length < 50
                    }
                },
                scatter: {
                    marker: {
                        radius: 4,
                        symbol: 'circle'
                    }
                },
                column: {
                    borderWidth: 0
                }
            },
            series: config.series || [],
            credits: {
                enabled: false
            },
            exporting: {
                enabled: this.options.enableExport
            },
            tooltip: {
                shared: config.series?.length > 1,
                useHTML: true,
                headerFormat: '<small>{point.key}</small><table>',
                pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                    '<td style="text-align: right"><b>{point.y}</b></td></tr>',
                footerFormat: '</table>',
                valueDecimals: 2
            }
        };

        // Merge with additional options
        const finalOptions = this.deepMerge(
            baseOptions,
            config.additionalOptions || {}
        );

        try {
            this.chart = Highcharts.chart(this.elements.chart, finalOptions);
            this.hideLoading();
        } catch (error) {
            Logger.error('Error creating chart:', error);
            this.showError('Error creating chart: ' + error.message);
        }
    }

    /**
     * Update chart data
     * @param {Array} series - New series data
     * @param {Array} [categories] - New categories
     */
    updateData(series, categories) {
        if (!this.chart) return;

        series.forEach((s, i) => {
            if (this.chart.series[i]) {
                this.chart.series[i].setData(s.data);
            }
        });

        if (categories) {
            this.chart.xAxis[0].setCategories(categories);
        }
    }

    /**
     * Set chart options
     * @param {Object} options - Highcharts options to merge
     */
    setChartOptions(options) {
        if (!this.chart) return;

        this.chart.update(options);
    }

    /**
     * Get chart instance
     * @returns {Highcharts.Chart|null}
     */
    getChart() {
        return this.chart;
    }

    /**
     * Check if modal is open
     * @returns {boolean}
     */
    get isModalOpen() {
        return this.isOpen;
    }

    /**
     * Debounce utility
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Destroy the modal manager
     */
    destroy() {
        this.close();
        this._removeAllListeners();
        this.elements = {};
        this.eventListeners = [];
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChartModal };
}

// Expose to global scope for browser
window.ChartModal = ChartModal;

