/**
 * LENDAS Shared Map Manager
 * Handles Leaflet map initialization, bounding box drawing, and display
 */

'use strict';

const MapManager = {

    /**
     * Initialize a Leaflet map with Draw controls for rectangle selection
     * @param {string|HTMLElement} containerId - Map container element or ID
     * @param {Object} [options] - Override options
     * @param {number[]} [options.center] - [lat, lng] center
     * @param {number} [options.zoom] - Initial zoom
     * @returns {{ map: L.Map, drawnItems: L.FeatureGroup, availabilityLayer: L.LayerGroup }}
     */
    initializeMap(containerId, options = {}) {
        const center = options.center || SHARED_CONSTANTS.MAP_CENTER;
        const zoom = options.zoom || SHARED_CONSTANTS.MAP_ZOOM;
        const resetZoomControlOptions = options.resetZoomControlOptions || {};
        const shouldAddResetZoomControl = options.resetZoomControl !== false;

        const map = L.map(containerId).setView(center, zoom);

        L.tileLayer(SHARED_CONSTANTS.OSM_TILE_URL, {
            attribution: SHARED_CONSTANTS.OSM_ATTRIBUTION,
            maxZoom: SHARED_CONSTANTS.MAP_MAX_ZOOM
        }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const availabilityLayer = L.layerGroup();
        map.addLayer(availabilityLayer);

        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                rectangle: {
                    shapeOptions: {
                        color: SHARED_CONSTANTS.MAP_DRAW_COLOR,
                        weight: SHARED_CONSTANTS.MAP_DRAW_WEIGHT,
                        fillOpacity: SHARED_CONSTANTS.MAP_DRAW_FILL_OPACITY
                    }
                },
                polygon: false,
                circle: false,
                marker: false,
                polyline: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });
        map.addControl(drawControl);

        if (shouldAddResetZoomControl) {
            const initialCenter = Array.isArray(center)
                ? [center[0], center[1]]
                : [map.getCenter().lat, map.getCenter().lng];
            const initialZoom = Number.isFinite(zoom) ? zoom : map.getZoom();

            MapManager.addResetZoomControl(map, {
                title: 'Reset Zoom',
                label: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
                labelIsHtml: true,
                getView: () => ({
                    center: initialCenter,
                    zoom: initialZoom
                }),
                ...resetZoomControlOptions
            });
        }

        return { map, drawnItems, availabilityLayer };
    },

    /**
     * Extract bounding box object from Leaflet LatLngBounds
     * @param {L.LatLngBounds} bounds - Leaflet bounds
     * @returns {{ south: number, west: number, north: number, east: number }|null}
     */
    extractBounds(bounds) {
        if (!bounds) return null;
        return {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };
    },

    /**
     * Set up standard draw event handlers that update a bounding box reference
     * @param {L.Map} map - Leaflet map instance
     * @param {L.FeatureGroup} drawnItems - Drawn items layer
     * @param {Function} onBboxChange - Callback receiving the new bbox object (or null)
     */
    setupDrawHandlers(map, drawnItems, onBboxChange) {
        map.on(L.Draw.Event.CREATED, (event) => {
            const layer = event.layer;
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            onBboxChange(MapManager.extractBounds(layer.getBounds()));
        });

        map.on(L.Draw.Event.EDITED, (event) => {
            let newBbox = null;
            event.layers.eachLayer((layer) => {
                newBbox = MapManager.extractBounds(layer.getBounds());
            });
            onBboxChange(newBbox);
        });

        map.on(L.Draw.Event.DELETED, () => {
            onBboxChange(null);
        });
    },

    /**
     * Update the BBOX display element with current bounding box info
     * @param {HTMLElement} bboxDisplay - Display container element
     * @param {{ south: number, west: number, north: number, east: number }|null} bbox - Current bbox
     */
    updateBboxDisplay(bboxDisplay, bbox) {
        if (!bboxDisplay) return;

        if (bbox) {
            bboxDisplay.innerHTML = `
                <strong>Selected area:</strong><br>
                N: ${bbox.north.toFixed(4)}° | 
                S: ${bbox.south.toFixed(4)}°<br>
                E: ${bbox.east.toFixed(4)}° | 
                W: ${bbox.west.toFixed(4)}°
            `;
            bboxDisplay.classList.add('bbox-display--active');
        } else {
            bboxDisplay.innerHTML = '<em>No area selected</em>';
            bboxDisplay.classList.remove('bbox-display--active');
        }
    },

    /**
     * Render GeoJSON point geometries as circle markers on an availability layer
     * @param {L.Map} map - Leaflet map
     * @param {L.LayerGroup} availabilityLayer - Target layer group
     * @param {Object} geometries - GeoJSON FeatureCollection
     * @param {Object} [options] - Options
     * @param {Function} [options.popupFactory] - Function(feature) returning popup content
     * @param {Function} [options.tooltipFactory] - Function(feature) returning tooltip content
     * @param {Function} [options.styleFactory] - Function(feature) returning style object
     * @param {Function} [options.pointStyleFactory] - Function(feature) returning circleMarker style overrides
     * @param {'click'|'hover'} [options.popupTrigger='click'] - Popup trigger mode
     * @param {Object} [options.tooltipOptions] - Leaflet tooltip options
     */
    renderGeometries(map, availabilityLayer, geometries, options = {}) {
        availabilityLayer.clearLayers();

        if (!geometries || !Array.isArray(geometries.features) || geometries.features.length === 0) {
            return;
        }

        const geoJsonOptions = {};
        const popupTrigger = options.popupTrigger === 'hover' ? 'hover' : 'click';

        const bindOverlayWithTrigger = (feature, layer) => {
            if (options.tooltipFactory) {
                layer.bindTooltip(options.tooltipFactory(feature), options.tooltipOptions || {});

                if (popupTrigger === 'hover') {
                    layer.on('mouseover', () => {
                        if (layer.openTooltip) layer.openTooltip();
                    });
                    layer.on('mouseout', () => {
                        if (layer.closeTooltip) layer.closeTooltip();
                    });
                }
                return;
            }

            if (!options.popupFactory) return;

            layer.bindPopup(options.popupFactory(feature));

            if (popupTrigger === 'hover') {
                layer.on('mouseover', () => {
                    if (layer.openPopup) layer.openPopup();
                });
                layer.on('mouseout', () => {
                    if (layer.closePopup) layer.closePopup();
                });
            }
        };

        if (options.styleFactory) {
            geoJsonOptions.style = options.styleFactory;
        }

        if (options.popupFactory || options.tooltipFactory) {
            geoJsonOptions.onEachFeature = (feature, layer) => {
                bindOverlayWithTrigger(feature, layer);
            };
        }

        // Default point rendering as circle markers
        geoJsonOptions.pointToLayer = (feature, latlng) => {
            const count = feature?.properties?.observations;
            const defaultPointStyle = {
                radius: SHARED_CONSTANTS.MARKER_BASE_RADIUS + Math.min(Number(count) || 0, 20) * 0.3,
                fillColor: SHARED_CONSTANTS.MARKER_FILL_COLOR,
                color: SHARED_CONSTANTS.MARKER_BORDER_COLOR,
                weight: SHARED_CONSTANTS.MARKER_WEIGHT,
                fillOpacity: SHARED_CONSTANTS.MARKER_FILL_OPACITY
            };
            const pointStyle = typeof options.pointStyleFactory === 'function'
                ? { ...defaultPointStyle, ...options.pointStyleFactory(feature) }
                : defaultPointStyle;
            return L.circleMarker(latlng, pointStyle);
        };

        const geoJsonLayer = L.geoJSON(geometries, geoJsonOptions);
        geoJsonLayer.addTo(availabilityLayer);

        if (geoJsonLayer.getBounds().isValid()) {
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [30, 30] });
        }
    },

    /**
     * Add a Reset Zoom control to a Leaflet map.
     * @param {L.Map} map - Leaflet map
     * @param {Object} [options] - Control options
     * @param {string} [options.position='topleft'] - Leaflet control position
     * @param {string} [options.label='Reset'] - Button label
     * @param {boolean} [options.labelIsHtml=false] - Whether label should be rendered as HTML
     * @param {string} [options.title='Reset Zoom'] - Button tooltip
     * @param {Function} [options.getView] - Callback returning view info:
     *   { bounds: L.LatLngBounds|Array, padding?: [number, number] }
     *   OR { center: [number, number], zoom: number }
     */
    addResetZoomControl(map, options = {}) {
        if (!map || typeof L === 'undefined' || !L.Control) {
            return;
        }

        const position = options.position || 'topleft';
        const label = options.label || 'Reset';
        const labelIsHtml = options.labelIsHtml === true;
        const title = options.title || 'Reset Zoom';
        const initialCenter = [map.getCenter().lat, map.getCenter().lng];
        const initialZoom = map.getZoom();
        const getView = typeof options.getView === 'function'
            ? options.getView
            : () => ({
                center: initialCenter,
                zoom: initialZoom
            });

        const ResetZoomControl = L.Control.extend({
            options: { position },
            onAdd() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-resetzoom');
                const button = L.DomUtil.create('a', 'leaflet-control-resetzoom__button', container);
                button.href = '#';
                button.title = title;
                button.setAttribute('role', 'button');
                button.setAttribute('aria-label', title);
                if (labelIsHtml) {
                    button.innerHTML = label;
                } else {
                    button.textContent = label;
                }

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(button, 'click', (event) => {
                    L.DomEvent.preventDefault(event);
                    const view = getView();
                    if (!view || typeof view !== 'object') {
                        return;
                    }

                    if (view.bounds) {
                        const bounds = Array.isArray(view.bounds)
                            ? L.latLngBounds(view.bounds)
                            : view.bounds;
                        if (bounds && bounds.isValid && bounds.isValid()) {
                            map.fitBounds(bounds, { padding: view.padding || [30, 30] });
                        }
                        return;
                    }

                    if (Array.isArray(view.center) && Number.isFinite(view.zoom)) {
                        map.setView(view.center, view.zoom);
                    }
                });

                return container;
            }
        });

        const control = new ResetZoomControl();
        map.addControl(control);
        return control;
    }
};
