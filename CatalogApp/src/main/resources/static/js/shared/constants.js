/**
 * LENDAS Shared Constants
 * Centralized constants used across multiple page modules
 */

'use strict';

const SHARED_CONSTANTS = Object.freeze({
    /** Debounce delay for availability refresh (ms) */
    AVAILABILITY_DEBOUNCE_MS: 350,

    /** Default date range for search forms */
    DEFAULT_START_DATE: '2000-01-01T00:00',
    DEFAULT_END_DATE: '2030-01-01T00:00',
    DEFAULT_END_DATE_EXTENDED: '2050-01-01T00:00',

    /** Default map center (Galicia) */
    MAP_CENTER: [43.0, -8.0],
    MAP_ZOOM: 7,
    MAP_MAX_ZOOM: 18,

    /** Map drawing style */
    MAP_DRAW_COLOR: '#3b7eff',
    MAP_DRAW_WEIGHT: 2,
    MAP_DRAW_FILL_OPACITY: 0.2,

    /** Marker / geometry styling */
    MARKER_FILL_COLOR: '#3b7eff',
    MARKER_BORDER_COLOR: '#2563eb',
    MARKER_WEIGHT: 2,
    MARKER_FILL_OPACITY: 0.7,
    MARKER_BASE_RADIUS: 6,

    /** Timeline SVG dimensions */
    TIMELINE_SVG_WIDTH: 800,
    TIMELINE_SVG_HEIGHT: 180,
    TIMELINE_PADDING: Object.freeze({ top: 20, right: 40, bottom: 50, left: 60 }),
    TIMELINE_GRID_LINES: 4,
    TIMELINE_MIN_BAR_WIDTH: 3,
    TIMELINE_ANIMATION_DELAY_MS: 80,

    /** Timeline gradient */
    TIMELINE_GRADIENT_COLOR: '#2a9d8f',
    TIMELINE_GRADIENT_OPACITY_START: 0.9,
    TIMELINE_GRADIENT_OPACITY_END: 0.6,

    /** Chart color palette for multi-process charts */
    PROCESS_COLORS: Object.freeze([
        '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7'
    ]),

    /** Chart tooltip styling */
    CHART_TOOLTIP_BG: 'rgba(15, 23, 42, 0.95)',
    CHART_TOOLTIP_BORDER: '#3b7eff',
    CHART_FONT_FAMILY: "'Inter', sans-serif",
    CHART_TITLE_COLOR: '#0f172a',
    CHART_GRID_COLOR: '#e2e8f0',
    CHART_BORDER_COLOR: '#cbd5e1',
    CHART_TICK_COLOR: '#64748b',

    /** WFS invalid value sentinel */
    WFS_INVALID_VALUE: -9999,

    /** OpenStreetMap tile URL */
    OSM_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    OSM_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
