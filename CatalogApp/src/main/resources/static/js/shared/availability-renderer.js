/**
 * LENDAS Shared Availability Renderer
 * Renders the availability timeline (SVG bar chart) and handles tooltip interaction.
 * Used by ctd, meteostations, vessel, roms, and wrf pages.
 */

'use strict';

const AvailabilityRenderer = {

    /**
     * Format a duration in milliseconds to a human-readable English string
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string}
     */
    formatDuration(durationMs) {
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
        if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    },

    /**
     * Format a date to short English locale string (month + year)
     * @param {Date|string|number} date - Date input
     * @returns {string}
     */
    formatDateShort(date) {
        if (!date) return '—';
        try {
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        } catch {
            return '—';
        }
    },

    /**
     * Get end date for a period, defaulting to now if missing
     * @param {Object} period - Period object with time_extension array
     * @returns {Date}
     */
    _getEndDate(period) {
        const end = period.time_extension?.[1];
        if (!end || end === '-' || end === '—') {
            return new Date();
        }
        return new Date(end);
    },

    /**
     * Render the availability timeline into a container element
     * @param {HTMLElement} container - Target container (will be replaced with timeline content)
     * @param {Array} periods - Array of period objects from the API
     * @param {Object} [options] - Options
     * @param {Function} [options.formatDateTime] - Custom datetime formatter for tooltip values
     */
    renderPeriodsSummary(container, periods, options = {}) {
        if (!container) return;

        const availabilitySectionId = 'availability-summary';

        if (!Array.isArray(periods) || periods.length === 0) {
            const existing = document.getElementById(availabilitySectionId);
            if (existing) existing.remove();
            return;
        }

        let summary = document.getElementById(availabilitySectionId);
        if (!summary) {
            summary = document.createElement('div');
            summary.id = availabilitySectionId;
            summary.className = 'availability-timeline';
            container.prepend(summary);
        }

        const C = SHARED_CONSTANTS;
        const fmtDateTime = options.formatDateTime || formatDateTime;

        // Sort periods by start date
        const sortedPeriods = [...periods].sort((a, b) => {
            const startA = new Date(a.time_extension?.[0] || 0).getTime();
            const startB = new Date(b.time_extension?.[0] || 0).getTime();
            return startA - startB;
        });

        const firstPeriod = sortedPeriods[0];
        const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
        const minDate = new Date(firstPeriod.time_extension?.[0] || 0);
        const maxDate = this._getEndDate(lastPeriod);
        const totalRange = maxDate.getTime() - minDate.getTime() || 1;
        const maxObservations = Math.max(...periods.map(p => p.observations || 0));

        const svgWidth = C.TIMELINE_SVG_WIDTH;
        const svgHeight = C.TIMELINE_SVG_HEIGHT;
        const padding = C.TIMELINE_PADDING;
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;
        const baselineY = padding.top + chartHeight;
        const maxBarHeight = chartHeight - 20;

        const bars = sortedPeriods.map((period, index) => {
            const start = new Date(period.time_extension?.[0]);
            const end = this._getEndDate(period);
            const duration = end.getTime() - start.getTime();
            const observations = period.observations || 0;

            const x = padding.left + ((start.getTime() - minDate.getTime()) / totalRange) * chartWidth;
            const width = Math.max((duration / totalRange) * chartWidth, C.TIMELINE_MIN_BAR_WIDTH);
            const height = maxObservations > 0 ? (observations / maxObservations) * maxBarHeight : 5;
            const y = baselineY - height;

            const startDate = fmtDateTime(period.time_extension?.[0]);
            const endValue = period.time_extension?.[1];
            const endDate = (!endValue || endValue === '-' || endValue === '—')
                ? 'Ongoing'
                : fmtDateTime(endValue);
            const resolution = period.avg_time_resolution ?? '—';
            const durationText = this.formatDuration(duration);

            return `
                <rect
                    class="timeline-bar timeline-bar--animate"
                    style="animation-delay: ${index * C.TIMELINE_ANIMATION_DELAY_MS}ms"
                    x="${x}" y="${y}" width="${width}" height="${height}"
                    data-index="${index}"
                    data-start="${startDate}"
                    data-end="${endDate}"
                    data-observations="${observations.toLocaleString()}"
                    data-resolution="${resolution}"
                    data-duration="${durationText}"
                />
            `;
        }).join('');

        const gridLines = [];
        for (let i = 0; i <= C.TIMELINE_GRID_LINES; i++) {
            const y = baselineY - (i / C.TIMELINE_GRID_LINES) * maxBarHeight;
            const value = Math.round((i / C.TIMELINE_GRID_LINES) * maxObservations);
            gridLines.push(`
                <line class="timeline-grid-line" x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}" />
                <text class="timeline-y-label" x="${padding.left - 8}" y="${y + 3}">${value.toLocaleString()}</text>
            `);
        }

        const totalObservations = periods.reduce((sum, p) => sum + (p.observations || 0), 0);

        summary.innerHTML = `
            <h2 class="availability-timeline__title">Data availability</h2>
            <div class="availability-timeline__content">
                <div class="availability-timeline__chart">
                    <svg class="availability-timeline__svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:${C.TIMELINE_GRADIENT_COLOR};stop-opacity:${C.TIMELINE_GRADIENT_OPACITY_START}" />
                                <stop offset="100%" style="stop-color:${C.TIMELINE_GRADIENT_COLOR};stop-opacity:${C.TIMELINE_GRADIENT_OPACITY_END}" />
                            </linearGradient>
                        </defs>
                        ${gridLines.join('')}
                        <line class="timeline-axis" x1="${padding.left}" y1="${baselineY}" x2="${svgWidth - padding.right}" y2="${baselineY}" />
                        ${bars}
                        <text class="timeline-label timeline-label--start" x="${padding.left}" y="${svgHeight - 15}">
                            ${this.formatDateShort(minDate)}
                        </text>
                        <text class="timeline-label timeline-label--end" x="${svgWidth - padding.right}" y="${svgHeight - 15}">
                            ${this.formatDateShort(maxDate)}
                        </text>
                    </svg>
                    <div class="timeline-tooltip" id="timeline-tooltip">
                        <div class="timeline-tooltip__title">Data period</div>
                        <div class="timeline-tooltip__row">
                            <span>Start:</span>
                            <span class="timeline-tooltip__value" id="tooltip-start"></span>
                        </div>
                        <div class="timeline-tooltip__row">
                            <span>End:</span>
                            <span class="timeline-tooltip__value" id="tooltip-end"></span>
                        </div>
                        <div class="timeline-tooltip__duration" id="tooltip-duration"></div>
                        <div class="timeline-tooltip__row">
                            <span>Observations:</span>
                            <span class="timeline-tooltip__value" id="tooltip-observations"></span>
                        </div>
                        <div class="timeline-tooltip__row">
                            <span>Resolution:</span>
                            <span class="timeline-tooltip__value" id="tooltip-resolution"></span>
                        </div>
                    </div>
                </div>
                <div class="timeline-stats">
                    <div class="timeline-stat">
                        <span class="timeline-stat__value">${periods.length}</span>
                        <span class="timeline-stat__label">Periods</span>
                    </div>
                    <div class="timeline-stat">
                        <span class="timeline-stat__value">${totalObservations.toLocaleString()}</span>
                        <span class="timeline-stat__label">Total observations</span>
                    </div>
                </div>
            </div>
            <div class="timeline-legend">
                <div class="timeline-legend__item">
                    <div class="timeline-legend__bar"></div>
                    <span>Width = period duration</span>
                </div>
                <div class="timeline-legend__item">
                    <div class="timeline-legend__bar" style="height: 16px;"></div>
                    <span>Height = number of observations</span>
                </div>
            </div>
        `;

        this._bindTooltipEvents(summary);
    },

    /**
     * Bind mouseenter/mouseleave events to timeline bars for tooltip display
     * @param {HTMLElement} container - Container with .timeline-bar elements
     * @private
     */
    _bindTooltipEvents(container) {
        const tooltip = document.getElementById('timeline-tooltip');
        if (!tooltip) return;

        const barElements = container.querySelectorAll('.timeline-bar');

        barElements.forEach(bar => {
            bar.addEventListener('mouseenter', () => {
                const rect = bar.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                document.getElementById('tooltip-start').textContent = bar.dataset.start;
                document.getElementById('tooltip-end').textContent = bar.dataset.end;
                document.getElementById('tooltip-duration').textContent = `Duration: ${bar.dataset.duration}`;
                document.getElementById('tooltip-observations').textContent = bar.dataset.observations;
                document.getElementById('tooltip-resolution').textContent = bar.dataset.resolution;

                const tooltipX = rect.left - containerRect.left + rect.width / 2 - 120;
                const tooltipY = rect.top - containerRect.top - 140;

                tooltip.style.left = `${Math.max(0, Math.min(tooltipX, containerRect.width - 240))}px`;
                tooltip.style.top = `${Math.max(0, tooltipY)}px`;
                tooltip.classList.add('timeline-tooltip--visible');
            });

            bar.addEventListener('mouseleave', () => {
                tooltip.classList.remove('timeline-tooltip--visible');
            });
        });
    }
};
