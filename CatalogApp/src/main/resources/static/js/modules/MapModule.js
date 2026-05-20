/**
 * LENDAS MapModule
 * Unified Leaflet map initialization with drawing controls
 *
 * Usage:
 *   const mapModule = new MapModule('map-container', {
 *     center: [43.0, -8.0],
 *     zoom: 7,
 *     onDrawComplete: (bounds) => Logger.log(bounds)
 *   });
 *   mapModule.initialize();
 */

'use strict';

/**
 * Map module for consistent Leaflet map initialization
 */
class MapModule {
    /**
     * @param {string} containerId - ID of container element
     * @param {Object} options - Configuration options
     * @param {Array} [options.center=[43.0, -8.0]] - Initial center [lat, lng]
     * @param {number} [options.zoom=7] - Initial zoom level
     * @param {number} [options.maxZoom=18] - Maximum zoom level
     * @param {boolean} [options.enableDraw=true] - Enable drawing controls
     * @param {Array} [options.drawModes=['rectangle']] - Enabled draw modes
     * @param {Function} [options.onDrawComplete] - Callback when draw completes
     * @param {Function} [options.onDrawEdit] - Callback when draw is edited
     * @param {Function} [options.onDrawDelete] - Callback when draw is deleted
     * @param {string} [options.tileUrl] - Custom tile URL
     * @param {Object} [options.tileOptions] - Tile layer options
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: [43.0, -8.0],
            zoom: 7,
            maxZoom: 18,
            enableDraw: true,
            drawModes: ['rectangle'],
            tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            tileOptions: {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18
            },
            ...options
        };

        this.map = null;
        this.drawnItems = null;
        this.drawControl = null;
        this.layers = new Map();
        this.currentBounds = null;
    }

    /**
     * Initialize the map
     * @returns {L.Map} Leaflet map instance
     */
    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Map container #${this.containerId} not found`);
        }

        // Create map
        this.map = L.map(this.containerId).setView(this.options.center, this.options.zoom);

        // Add base tile layer
        L.tileLayer(this.options.tileUrl, this.options.tileOptions).addTo(this.map);

        // Initialize feature group for drawn items
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Setup drawing controls if enabled
        if (this.options.enableDraw) {
            this.setupDrawControl();
        }

        // Setup event listeners
        this.setupEventListeners();

        return this.map;
    }

    /**
     * Setup Leaflet Draw control
     * @param {Object} customOptions - Override default draw options
     */
    setupDrawControl(customOptions = {}) {
        if (!this.map || !this.drawnItems) return;

        const defaultDrawOptions = {
            rectangle: this.options.drawModes.includes('rectangle') ? {
                shapeOptions: {
                    color: '#3b7eff',
                    weight: 2,
                    fillOpacity: 0.2
                }
            } : false,
            polygon: this.options.drawModes.includes('polygon'),
            circle: this.options.drawModes.includes('circle'),
            marker: this.options.drawModes.includes('marker'),
            polyline: this.options.drawModes.includes('polyline'),
            circlemarker: false
        };

        const drawOptions = { ...defaultDrawOptions, ...customOptions };

        this.drawControl = new L.Control.Draw({
            position: 'topright',
            draw: drawOptions,
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });

        this.map.addControl(this.drawControl);
    }

    /**
     * Setup map event listeners
     */
    setupEventListeners() {
        if (!this.map) return;

        // Handle created event
        this.map.on(L.Draw.Event.CREATED, (event) => {
            const layer = event.layer;

            // Clear previous drawings
            this.drawnItems.clearLayers();

            // Add new drawing
            this.drawnItems.addLayer(layer);

            // Store bounds
            const bounds = layer.getBounds();
            this.currentBounds = {
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast()
            };

            // Trigger callback
            if (this.options.onDrawComplete) {
                this.options.onDrawComplete(this.currentBounds, layer);
            }
        });

        // Handle edited event
        this.map.on(L.Draw.Event.EDITED, (event) => {
            const layers = event.layers;
            layers.eachLayer((layer) => {
                const bounds = layer.getBounds();
                this.currentBounds = {
                    south: bounds.getSouth(),
                    west: bounds.getWest(),
                    north: bounds.getNorth(),
                    east: bounds.getEast()
                };
            });

            if (this.options.onDrawEdit) {
                this.options.onDrawEdit(this.currentBounds);
            }
        });

        // Handle deleted event
        this.map.on(L.Draw.Event.DELETED, () => {
            this.currentBounds = null;

            if (this.options.onDrawDelete) {
                this.options.onDrawDelete();
            }
        });
    }

    /**
     * Get current bounding box
     * @returns {Object|null} Bounds with south, west, north, east or null
     */
    getBounds() {
        return this.currentBounds;
    }

    /**
     * Get bounds as EWKT string
     * @returns {string|null} EWKT polygon or null
     */
    getBoundsAsEwkt() {
        if (!this.currentBounds) return null;

        const { west, south, east, north } = this.currentBounds;
        const formatCoord = (coord) => coord.toFixed(6);
        return `SRID=4326;POLYGON((${formatCoord(west)} ${formatCoord(south)}, ${formatCoord(east)} ${formatCoord(south)}, ${formatCoord(east)} ${formatCoord(north)}, ${formatCoord(west)} ${formatCoord(north)}, ${formatCoord(west)} ${formatCoord(south)}))`;
    }

    /**
     * Set bounds programmatically
     * @param {Object} bounds - Bounds with south, west, north, east
     * @param {boolean} [addLayer=true] - Add rectangle layer to map
     */
    setBounds(bounds, addLayer = true) {
        this.currentBounds = bounds;

        if (addLayer && this.map && this.drawnItems) {
            this.drawnItems.clearLayers();
            const rectangle = L.rectangle([
                [bounds.south, bounds.west],
                [bounds.north, bounds.east]
            ], {
                color: '#3b7eff',
                weight: 2,
                fillOpacity: 0.2
            });
            this.drawnItems.addLayer(rectangle);
        }
    }

    /**
     * Clear all drawn items
     */
    clearDrawnItems() {
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        this.currentBounds = null;
    }

    /**
     * Add a layer group
     * @param {string} name - Layer name
     * @param {L.LayerGroup} layer - Layer group
     */
    addLayer(name, layer) {
        this.layers.set(name, layer);
        if (this.map) {
            this.map.addLayer(layer);
        }
    }

    /**
     * Get a layer by name
     * @param {string} name - Layer name
     * @returns {L.LayerGroup|undefined}
     */
    getLayer(name) {
        return this.layers.get(name);
    }

    /**
     * Remove a layer by name
     * @param {string} name - Layer name
     */
    removeLayer(name) {
        const layer = this.layers.get(name);
        if (layer && this.map) {
            this.map.removeLayer(layer);
        }
        this.layers.delete(name);
    }

    /**
     * Clear all layers except base and drawn items
     */
    clearLayers() {
        this.layers.forEach((layer) => {
            if (this.map) {
                this.map.removeLayer(layer);
            }
        });
        this.layers.clear();
    }

    /**
     * Fit map to bounds
     * @param {Object|Array} bounds - Bounds or LatLngBounds
     * @param {Object} options - Fit bounds options
     */
    fitBounds(bounds, options = {}) {
        if (!this.map) return;

        const defaultOptions = { padding: [20, 20] };
        this.map.fitBounds(bounds, { ...defaultOptions, ...options });
    }

    /**
     * Set map view
     * @param {Array} center - [lat, lng]
     * @param {number} zoom - Zoom level
     */
    setView(center, zoom) {
        if (this.map) {
            this.map.setView(center, zoom);
        }
    }

    /**
     * Get map center
     * @returns {L.LatLng|null}
     */
    getCenter() {
        return this.map ? this.map.getCenter() : null;
    }

    /**
     * Get map zoom
     * @returns {number|null}
     */
    getZoom() {
        return this.map ? this.map.getZoom() : null;
    }

    /**
     * Invalidate map size (useful after container resize)
     */
    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    /**
     * Enable/disable drawing
     * @param {boolean} enabled - Whether drawing should be enabled
     */
    setDrawingEnabled(enabled) {
        if (!this.drawControl) return;

        if (enabled) {
            this.map.addControl(this.drawControl);
        } else {
            this.map.removeControl(this.drawControl);
        }
    }

    /**
     * Check if map has drawing
     * @returns {boolean}
     */
    hasDrawing() {
        return this.drawnItems && this.drawnItems.getLayers().length > 0;
    }

    /**
     * Get drawing layer
     * @returns {L.Layer|null}
     */
    getDrawingLayer() {
        if (!this.drawnItems || this.drawnItems.getLayers().length === 0) {
            return null;
        }
        return this.drawnItems.getLayers()[0];
    }

    /**
     * Destroy the map and clean up
     */
    destroy() {
        this.clearLayers();

        if (this.drawnItems && this.map) {
            this.map.removeLayer(this.drawnItems);
        }

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.drawnItems = null;
        this.drawControl = null;
        this.currentBounds = null;
        this.layers.clear();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MapModule };
}

// Expose to global scope for browser
window.MapModule = MapModule;

