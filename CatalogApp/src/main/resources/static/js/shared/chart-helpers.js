/**
 * LENDAS Shared Chart Helpers
 * Common functionality for Chart.js-based chart modals (variable checkboxes, download, select/deselect)
 */

'use strict';

function clampColorChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function darkenRgb(r, g, b, factor = 0.72) {
    return [
        clampColorChannel(r * factor),
        clampColorChannel(g * factor),
        clampColorChannel(b * factor)
    ];
}

function normalizeLineColor(color) {
    if (typeof color !== 'string') {
        return color;
    }

    const value = color.trim();

    // #RGB or #RRGGBB
    const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1];
        const expanded = hex.length === 3
            ? hex.split('').map((c) => c + c).join('')
            : hex;
        const r = parseInt(expanded.slice(0, 2), 16);
        const g = parseInt(expanded.slice(2, 4), 16);
        const b = parseInt(expanded.slice(4, 6), 16);
        const [dr, dg, db] = darkenRgb(r, g, b);
        return `rgb(${dr}, ${dg}, ${db})`;
    }

    // rgb(...) or rgba(...)
    const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map((part) => part.trim());
        const r = Number(parts[0]);
        const g = Number(parts[1]);
        const b = Number(parts[2]);
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
            const [dr, dg, db] = darkenRgb(r, g, b);
            return `rgb(${dr}, ${dg}, ${db})`;
        }
    }

    return value;
}

const ChartHelpers = {

    /**
     * Build variable checkbox cards for chart variable selection
     * @param {HTMLElement} container - Container element for checkboxes
     * @param {Object} measures - Object with variable names as keys and arrays as values
     * @param {Object} variableConfig - Config object mapping varName to { label, color, borderWidth }
     * @param {string[]} [defaultSelected=[]] - Variable names selected by default
     * @param {Function} onChangeCallback - Called when any checkbox changes
     */
    buildVariableCheckboxes(container, measures, variableConfig, defaultSelected = [], onChangeCallback) {
        if (!container || !measures) return;

        container.innerHTML = '';

        Object.keys(measures).forEach(varName => {
            const config = variableConfig[varName];
            if (!config) {
                // For unknown variables, create a default config
                // but only if there's data
            }

            const effectiveConfig = config || {
                label: varName,
                color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
                borderWidth: 2
            };

            const values = measures[varName];
            const hasData = Array.isArray(values) && values.some(v => v !== null && v !== undefined);
            if (!hasData) return;

            const isSelected = defaultSelected.includes(varName);

            const card = document.createElement('div');
            card.className = `chart-variable-card${isSelected ? ' chart-variable-card--active' : ''}`;
            card.dataset.varName = varName;

            const indicator = document.createElement('span');
            indicator.className = 'chart-variable-card__indicator';
            indicator.style.backgroundColor = effectiveConfig.color;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `var-${varName}`;
            checkbox.value = varName;
            checkbox.checked = isSelected;
            checkbox.className = 'chart-variable-card__checkbox';
            checkbox.addEventListener('change', (e) => {
                card.classList.toggle('chart-variable-card--active', e.target.checked);
                if (onChangeCallback) onChangeCallback();
            });

            const label = document.createElement('label');
            label.htmlFor = `var-${varName}`;
            label.className = 'chart-variable-card__label';
            label.textContent = effectiveConfig.label;

            card.addEventListener('click', (e) => {
                if (e.target !== checkbox && e.target !== label) {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('chart-variable-card--active', checkbox.checked);
                    if (onChangeCallback) onChangeCallback();
                }
            });

            card.appendChild(indicator);
            card.appendChild(checkbox);
            card.appendChild(label);
            container.appendChild(card);
        });
    },

    /**
     * Build process checkbox cards for multi-process chart selection
     * @param {HTMLElement} container - Container element
     * @param {Object} processGroups - { procId: [features...] }
     * @param {string[]} colors - Color palette
     * @param {Function} onChangeCallback - Called when any checkbox changes
     */
    buildProcessCheckboxes(container, processGroups, colors, onChangeCallback) {
        if (!container) return;

        container.innerHTML = '';
        const processes = Object.keys(processGroups).sort();

        processes.forEach((procId, index) => {
            const color = colors[index % colors.length];

            const card = document.createElement('div');
            card.className = 'chart-variable-card chart-variable-card--active';
            card.dataset.procId = procId;

            const indicator = document.createElement('span');
            indicator.className = 'chart-variable-card__indicator';
            indicator.style.backgroundColor = color;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `proc-${procId}`;
            checkbox.value = procId;
            checkbox.checked = true;
            checkbox.className = 'chart-variable-card__checkbox';
            checkbox.addEventListener('change', (e) => {
                card.classList.toggle('chart-variable-card--active', e.target.checked);
                if (onChangeCallback) onChangeCallback();
            });

            const label = document.createElement('label');
            label.htmlFor = `proc-${procId}`;
            label.className = 'chart-variable-card__label';
            label.textContent = `Process ${procId} (${processGroups[procId].length} obs.)`;

            card.addEventListener('click', (e) => {
                if (e.target !== checkbox && e.target !== label) {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('chart-variable-card--active', checkbox.checked);
                    if (onChangeCallback) onChangeCallback();
                }
            });

            card.appendChild(indicator);
            card.appendChild(checkbox);
            card.appendChild(label);
            container.appendChild(card);
        });
    },

    /**
     * Get currently selected variable names from checkboxes in a container
     * @param {string} containerSelector - CSS selector for the checkbox container
     * @returns {string[]}
     */
    getSelectedValues(containerSelector) {
        const checkboxes = document.querySelectorAll(`${containerSelector} input[type="checkbox"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    },

    /**
     * Select or deselect all checkboxes in a container
     * @param {string} containerSelector - CSS selector for the checkbox container
     * @param {boolean} checked - Whether to check or uncheck
     * @param {Function} [onChangeCallback] - Called after toggling
     */
    toggleAll(containerSelector, checked, onChangeCallback) {
        document.querySelectorAll(`${containerSelector} input[type="checkbox"]`).forEach(cb => {
            cb.checked = checked;
            const card = cb.closest('.chart-variable-card');
            if (card) {
                card.classList.toggle('chart-variable-card--active', checked);
            }
        });
        if (onChangeCallback) onChangeCallback();
    },

    /**
     * Download a Chart.js chart as PNG
     * @param {Chart} chart - Chart.js instance
     * @param {string} [filenamePrefix='chart'] - Filename prefix
     */
    downloadChart(chart, filenamePrefix = 'chart') {
        if (!chart) {
            notifications.warning('There is no chart to download.');
            return;
        }

        try {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.download = `${filenamePrefix}-${Date.now()}.png`;
            link.href = url;
            link.click();
        } catch (error) {
            Logger.error('Error downloading chart:', error);
            notifications.error('Error downloading the chart. Please try again.');
        }
    },

    /**
     * Get common Chart.js tooltip configuration
     * @returns {Object}
     */
    getTooltipConfig() {
        const C = SHARED_CONSTANTS;
        return {
            enabled: true,
            backgroundColor: C.CHART_TOOLTIP_BG,
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: C.CHART_TOOLTIP_BORDER,
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            titleFont: {
                size: 13,
                weight: 'bold',
                family: C.CHART_FONT_FAMILY
            },
            bodyFont: {
                size: 12,
                family: C.CHART_FONT_FAMILY
            }
        };
    },

    /**
     * Get common Chart.js axis configuration
     * @param {Object} options - Axis options
     * @param {string} options.titleText - Axis title
     * @param {string} [options.type='linear'] - Axis type
     * @param {boolean} [options.reverse=false] - Reverse axis
     * @param {string} [options.position] - Axis position
     * @returns {Object}
     */
    getAxisConfig(options = {}) {
        const C = SHARED_CONSTANTS;
        const config = {
            type: options.type || 'linear',
            title: {
                display: true,
                text: options.titleText || '',
                font: {
                    size: 13,
                    weight: 'bold',
                    family: C.CHART_FONT_FAMILY
                },
                color: C.CHART_TITLE_COLOR
            },
            grid: {
                color: C.CHART_GRID_COLOR,
                drawBorder: true,
                borderColor: C.CHART_BORDER_COLOR,
                borderWidth: 2
            },
            ticks: {
                font: {
                    size: 11,
                    family: C.CHART_FONT_FAMILY
                },
                color: C.CHART_TICK_COLOR
            }
        };

        if (options.reverse) config.reverse = true;
        if (options.position) config.position = options.position;

        return config;
    },

    /**
     * Apply stronger visual defaults to line datasets so traces are easier to read.
     * Mutates and returns the same dataset array.
     * @param {Object[]} datasets - Chart.js datasets
     * @param {Object} [options]
     * @param {number} [options.minBorderWidth=3] - Minimum line width
     * @param {number} [options.minPointRadius=2.5] - Minimum point radius
     * @param {number} [options.minPointHoverRadius=5] - Minimum hover point radius
     * @param {number} [options.pointBorderWidth=1.25] - Point border width
     * @param {number} [options.minTension=0.12] - Minimum curve tension
     * @returns {Object[]}
     */
    enhanceLineDatasets(datasets, options = {}) {
        if (!Array.isArray(datasets)) {
            return [];
        }

        const {
            minBorderWidth = 4,
            pointRadius = 0,
            minPointHoverRadius = 6,
            pointBorderWidth = 0,
            minTension = 0.15
        } = options;

        datasets.forEach((dataset) => {
            if (!dataset || typeof dataset !== 'object') {
                return;
            }

            const borderWidth = Number(dataset.borderWidth);
            const pointHoverRadius = Number(dataset.pointHoverRadius);
            const tension = Number(dataset.tension);

            dataset.borderWidth = Number.isFinite(borderWidth)
                ? Math.max(borderWidth, minBorderWidth)
                : minBorderWidth;
            dataset.pointRadius = pointRadius;
            dataset.pointHoverRadius = Number.isFinite(pointHoverRadius)
                ? Math.max(pointHoverRadius, minPointHoverRadius)
                : minPointHoverRadius;
            dataset.pointBorderWidth = pointBorderWidth;
            dataset.pointHitRadius = Math.max(minPointHoverRadius + 2, 8);
            dataset.tension = Number.isFinite(tension)
                ? Math.max(tension, minTension)
                : minTension;
            dataset.showLine = true;
            dataset.fill = false;
            dataset.borderDash = [];
            dataset.borderJoinStyle = 'round';
            dataset.borderCapStyle = 'round';
            dataset.borderColor = normalizeLineColor(dataset.borderColor);
            dataset.pointBackgroundColor = normalizeLineColor(dataset.pointBackgroundColor || dataset.borderColor);
        });

        return datasets;
    }
};

