/**
 * LENDAS TimelineRenderer Module
 * Unified SVG timeline rendering for availability visualization
 *
 * Usage:
 *   const timeline = new TimelineRenderer('timeline-container', {
 *     color: '#3b7eff',
 *     onSegmentClick: (segment) => Logger.log(segment)
 *   });
 *   timeline.render(availabilityData);
 */

'use strict';

/**
 * Timeline renderer for availability data visualization
 */
class TimelineRenderer {
    /**
     * @param {string} containerId - ID of container element
     * @param {Object} options - Configuration options
     * @param {string} [options.color='#3b7eff'] - Primary color for segments
     * @param {string} [options.backgroundColor='#f0f0f0'] - Background color
     * @param {number} [options.height=60] - SVG height in pixels
     * @param {number} [options.segmentHeight=24] - Height of each segment bar
     * @param {number} [options.padding=10] - Padding around the timeline
     * @param {Function} [options.onSegmentClick] - Callback when segment is clicked
     * @param {Function} [options.onSegmentHover] - Callback when segment is hovered
     * @param {boolean} [options.showLabels=true] - Show month/year labels
     * @param {boolean} [options.animate=true] - Animate segments on render
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            color: '#3b7eff',
            backgroundColor: '#f0f0f0',
            height: 60,
            segmentHeight: 24,
            padding: 10,
            showLabels: true,
            animate: true,
            ...options
        };

        this.container = null;
        this.svg = null;
        this.data = null;
        this.segmentListeners = [];
        this.resizeHandler = null;

        this.bindResize();
    }

    /**
     * Bind resize handler for responsive rendering
     * @private
     */
    bindResize() {
        this.resizeHandler = this.debounce(() => {
            if (this.data && this.container) {
                this.render(this.data);
            }
        }, 250);
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Debounce utility
     * @private
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Render timeline with availability data
     * @param {Object} data - Availability data
     * @param {Array} data.periods - Array of periods with start_time and end_time
     * @param {string} data.start_time - Overall start time
     * @param {string} data.end_time - Overall end time
     * @param {string} [data.procedure] - Procedure identifier
     */
    render(data) {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            Logger.error(`Timeline container #${this.containerId} not found`);
            return;
        }

        this.data = data;
        this.container.innerHTML = '';

        if (!data || !data.periods || data.periods.length === 0) {
            this.renderEmpty();
            return;
        }

        this.createSvg();
        this.renderSegments();
        this.renderLabels();
    }

    /**
     * Create SVG element
     */
    createSvg() {
        const width = this.container.clientWidth || 800;
        const { height } = this.options;

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.svg.style.display = 'block';

        // Background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', width);
        bg.setAttribute('height', height);
        bg.setAttribute('fill', this.options.backgroundColor);
        bg.setAttribute('rx', '4');
        this.svg.appendChild(bg);

        this.container.appendChild(this.svg);
    }

    /**
     * Render availability segments
     */
    renderSegments() {
        if (!this.svg || !this.data) return;

        const width = this.container.clientWidth || 800;
        const { height, segmentHeight, padding, color, animate } = this.options;

        const overallStart = new Date(this.data.start_time);
        const overallEnd = new Date(this.data.end_time);
        const totalDuration = overallEnd.getTime() - overallStart.getTime();

        if (totalDuration <= 0) return;

        const barY = (height - segmentHeight) / 2;
        const scaleX = (width - 2 * padding) / totalDuration;

        this.data.periods.forEach((period, index) => {
            const start = new Date(period.start_time);
            const end = new Date(period.end_time);

            const x = padding + (start.getTime() - overallStart.getTime()) * scaleX;
            const segmentWidth = (end.getTime() - start.getTime()) * scaleX;

            // Ensure minimum width for visibility
            const finalWidth = Math.max(segmentWidth, 2);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', barY);
            rect.setAttribute('width', animate ? 0 : finalWidth);
            rect.setAttribute('height', segmentHeight);
            rect.setAttribute('fill', color);
            rect.setAttribute('rx', '2');
            rect.setAttribute('class', 'timeline-segment');
            rect.style.cursor = this.options.onSegmentClick ? 'pointer' : 'default';

            // Store data for callbacks
            rect.dataset.index = index;
            rect.dataset.start = period.start_time;
            rect.dataset.end = period.end_time;

            // Add interactivity
            if (this.options.onSegmentClick) {
                const clickHandler = () => {
                    this.options.onSegmentClick(period, index);
                };
                rect.addEventListener('click', clickHandler);
                this.segmentListeners.push({ element: rect, event: 'click', handler: clickHandler });
            }

            if (this.options.onSegmentHover) {
                const mouseenterHandler = () => {
                    rect.setAttribute('opacity', '0.8');
                    this.options.onSegmentHover(period, index, true);
                };
                const mouseleaveHandler = () => {
                    rect.setAttribute('opacity', '1');
                    this.options.onSegmentHover(period, index, false);
                };
                rect.addEventListener('mouseenter', mouseenterHandler);
                rect.addEventListener('mouseleave', mouseleaveHandler);
                this.segmentListeners.push(
                    { element: rect, event: 'mouseenter', handler: mouseenterHandler },
                    { element: rect, event: 'mouseleave', handler: mouseleaveHandler }
                );
            }

            // Tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${this.formatDate(start)} - ${this.formatDate(end)}`;
            rect.appendChild(title);

            this.svg.appendChild(rect);

            // Animate width
            if (animate) {
                setTimeout(() => {
                    rect.style.transition = 'width 0.3s ease-out';
                    rect.setAttribute('width', finalWidth);
                }, index * 50);
            }
        });
    }

    /**
     * Render month/year labels
     */
    renderLabels() {
        if (!this.svg || !this.options.showLabels || !this.data) return;

        const width = this.container.clientWidth || 800;
        const { height, padding } = this.options;

        const overallStart = new Date(this.data.start_time);
        const overallEnd = new Date(this.data.end_time);
        const totalDuration = overallEnd.getTime() - overallStart.getTime();

        if (totalDuration <= 0) return;

        const scaleX = (width - 2 * padding) / totalDuration;

        // Determine label granularity based on duration
        const days = totalDuration / (1000 * 60 * 60 * 24);
        let interval;
        let format;

        if (days <= 7) {
            interval = 1000 * 60 * 60 * 24; // Daily
            format = (d) => d.getDate().toString();
        } else if (days <= 90) {
            interval = 1000 * 60 * 60 * 24 * 7; // Weekly
            format = (d) => `S${Math.ceil(d.getDate() / 7)}`;
        } else if (days <= 730) {
            interval = 1000 * 60 * 60 * 24 * 30; // Monthly
            format = (d) => d.toLocaleDateString('es-ES', { month: 'short' });
        } else {
            interval = 1000 * 60 * 60 * 24 * 365; // Yearly
            format = (d) => d.getFullYear().toString();
        }

        // Generate labels
        const labels = [];
        let current = new Date(overallStart);

        while (current.getTime() <= overallEnd.getTime()) {
            labels.push(new Date(current));
            current = new Date(current.getTime() + interval);
        }

        // Render labels
        labels.forEach((date, index) => {
            const x = padding + (date.getTime() - overallStart.getTime()) * scaleX;

            // Tick mark
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', height - 5);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', height);
            tick.setAttribute('stroke', '#999');
            tick.setAttribute('stroke-width', '1');
            this.svg.appendChild(tick);

            // Label text (skip every other for readability if many labels)
            if (labels.length > 12 && index % 2 !== 0) return;

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + 2);
            text.setAttribute('y', height - 8);
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#666');
            text.textContent = format(date);
            this.svg.appendChild(text);
        });
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="timeline-empty" style="
                height: ${this.options.height}px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                font-size: 12px;
                background: ${this.options.backgroundColor};
                border-radius: 4px;
            ">
                No availability data
            </div>
        `;
    }

    /**
     * Update timeline color
     * @param {string} color - New color
     */
    setColor(color) {
        this.options.color = color;
        if (this.svg) {
            const segments = this.svg.querySelectorAll('.timeline-segment');
            segments.forEach(seg => seg.setAttribute('fill', color));
        }
    }

    /**
     * Remove all segment event listeners
     * @private
     */
    _removeSegmentListeners() {
        this.segmentListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.segmentListeners = [];
    }

    /**
     * Clear the timeline
     */
    clear() {
        this._removeSegmentListeners();
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.svg = null;
        this.data = null;
    }

    /**
     * Format date for display
     * @param {Date} date - Date object
     * @returns {string} Formatted date
     */
    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Get segment at specific index
     * @param {number} index - Segment index
     * @returns {Object|null} Segment data
     */
    getSegment(index) {
        if (!this.data || !this.data.periods) return null;
        return this.data.periods[index] || null;
    }

    /**
     * Highlight a segment
     * @param {number} index - Segment index
     * @param {boolean} [highlight=true] - Whether to highlight
     */
    highlightSegment(index, highlight = true) {
        if (!this.svg) return;

        const segment = this.svg.querySelector(`[data-index="${index}"]`);
        if (segment) {
            segment.setAttribute('opacity', highlight ? '0.6' : '1');
            segment.setAttribute('stroke', highlight ? '#000' : 'none');
            segment.setAttribute('stroke-width', highlight ? '2' : '0');
        }
    }

    /**
     * Destroy the renderer
     */
    destroy() {
        this.clear();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        this.segmentListeners = [];
        this.container = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimelineRenderer };
}

// Expose to global scope for browser
window.TimelineRenderer = TimelineRenderer;

