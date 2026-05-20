'use strict';

const AvailabilityStyle = {
    DEFAULT_COLOR_STOPS: ['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'],

    createController(map, options = {}) {
        const colorStops = Array.isArray(options.colorStops) && options.colorStops.length >= 2
            ? options.colorStops
            : AvailabilityStyle.DEFAULT_COLOR_STOPS;
        const legendTitle = options.legendTitle || 'Observations';
        const legendPosition = options.legendPosition || 'bottomright';
        let legendControl = null;

        function getObservationCount(feature) {
            const raw = feature?.properties?.observations;
            const value = Number(raw);
            return Number.isFinite(value) && value >= 0 ? value : null;
        }

        function computeStats(geometries) {
            const counts = Array.isArray(geometries?.features)
                ? geometries.features.map(getObservationCount).filter(value => value !== null)
                : [];

            if (counts.length === 0) {
                return null;
            }

            return {
                min: Math.min(...counts),
                max: Math.max(...counts)
            };
        }

        function hexToRgb(hex) {
            const normalized = String(hex || '').replace('#', '').trim();
            if (normalized.length !== 6) {
                return { r: 0, g: 0, b: 0 };
            }
            return {
                r: Number.parseInt(normalized.slice(0, 2), 16),
                g: Number.parseInt(normalized.slice(2, 4), 16),
                b: Number.parseInt(normalized.slice(4, 6), 16)
            };
        }

        function rgbToHex({ r, g, b }) {
            const toHex = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        function interpolateColor(startHex, endHex, ratio) {
            const start = hexToRgb(startHex);
            const end = hexToRgb(endHex);
            return rgbToHex({
                r: start.r + (end.r - start.r) * ratio,
                g: start.g + (end.g - start.g) * ratio,
                b: start.b + (end.b - start.b) * ratio
            });
        }

        function getColor(value, stats) {
            if (!stats || value === null) {
                return colorStops[0];
            }

            if (stats.max <= stats.min) {
                return colorStops[colorStops.length - 1];
            }

            const normalized = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min)));
            const segments = colorStops.length - 1;
            const scaled = normalized * segments;
            const index = Math.min(Math.floor(scaled), segments - 1);
            const ratio = scaled - index;
            return interpolateColor(colorStops[index], colorStops[index + 1], ratio);
        }

        function getNormalizedRatio(count, stats) {
            if (!stats || count === null || stats.max <= stats.min) {
                return 1;
            }
            return Math.max(0, Math.min(1, (count - stats.min) / (stats.max - stats.min)));
        }

        function formatLegendValue(value) {
            if (!Number.isFinite(value)) {
                return '—';
            }
            if (Math.abs(value) >= 100 || Number.isInteger(value)) {
                return String(Math.round(value));
            }
            return value.toFixed(1);
        }

        function clearLegend() {
            if (legendControl) {
                legendControl.remove();
                legendControl = null;
            }
        }

        function updateLegend(stats) {
            clearLegend();

            if (!stats) {
                return;
            }

            legendControl = L.control({ position: legendPosition });
            legendControl.onAdd = () => {
                const container = L.DomUtil.create('div', 'leaflet-control availability-legend');
                const gradient = colorStops.join(', ');
                const minLabel = formatLegendValue(stats.min);
                const maxLabel = formatLegendValue(stats.max);
                const rangeLabel = stats.max > stats.min ? `${minLabel} - ${maxLabel}` : minLabel;

                container.innerHTML = `
                    <div class="availability-legend__title">${legendTitle}</div>
                    <div class="availability-legend__scale" style="background: linear-gradient(90deg, ${gradient});"></div>
                    <div class="availability-legend__labels">
                        <span>${minLabel}</span>
                        <span>${maxLabel}</span>
                    </div>
                    <div class="availability-legend__range">${rangeLabel}</div>
                `;

                L.DomEvent.disableClickPropagation(container);
                return container;
            };
            legendControl.addTo(map);
        }

        function getPointStyle(feature, stats, overrides = {}) {
            const count = getObservationCount(feature);
            const ratio = getNormalizedRatio(count, stats);
            const color = getColor(count, stats);

            return {
                radius: 7 + (ratio * 5),
                fillColor: color,
                color: '#1e3a8a',
                weight: 1.4,
                fillOpacity: 0.88,
                opacity: 0.95,
                ...overrides
            };
        }

        function getFeatureStyle(feature, stats, overrides = {}) {
            const count = getObservationCount(feature);
            const ratio = getNormalizedRatio(count, stats);
            const color = getColor(count, stats);

            return {
                color,
                weight: 2 + (ratio * 2),
                opacity: 0.95,
                fillColor: color,
                fillOpacity: 0.2 + (ratio * 0.3),
                ...overrides
            };
        }

        function getHoverFeatureStyle(feature, stats, overrides = {}) {
            const count = getObservationCount(feature);
            const ratio = getNormalizedRatio(count, stats);
            const color = getColor(count, stats);

            return {
                color,
                weight: 3 + (ratio * 2.5),
                opacity: 1,
                fillColor: color,
                fillOpacity: 0.38 + (ratio * 0.2),
                ...overrides
            };
        }

        return {
            clearLegend,
            computeStats,
            getObservationCount,
            getPointStyle,
            getFeatureStyle,
            getHoverFeatureStyle,
            updateLegend
        };
    }
};
