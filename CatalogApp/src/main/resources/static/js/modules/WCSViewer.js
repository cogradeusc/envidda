/**
 * LENDAS WCSViewer Module
 * Base class for WCS (Web Coverage Service) visualization pages (ROMS and WRF)
 *
 * Usage:
 *   class ROMSViewer extends WCSViewer {
 *     constructor() {
 *       super({
 *         schema: 'roms_meteogalicia',
 *         name: 'modelo_roms',
 *         layerOptions: ROMS_LAYER_OPTIONS,
 *         depthLevels: ROMS_DEPTH_LEVELS
 *       });
 *     }
 *   }
 */

'use strict';

/**
 * Base class for WCS model visualization (ROMS, WRF)
 * Extends BaseViewer with WCS-specific functionality
 */
class WCSViewer extends BaseViewer {
    /**
     * @param {Object} config - WCS viewer configuration
     * @param {string} config.schema - Schema name
     * @param {string} config.name - Process name
     * @param {Array} config.layerOptions - Layer configuration options
     * @param {Array} [config.depthLevels] - Depth/elevation levels (for ROMS)
     * @param {number} [config.timeSteps=24] - Number of time steps
     * @param {string} [config.wcsLayer] - WCS layer name
     * @param {string} [config.modalId] - Modal ID for WCS visualization
     */
    constructor(config) {
        super(config);

        if (new.target === WCSViewer) {
            throw new Error('WCSViewer is abstract and cannot be instantiated directly');
        }

        this.wcsState = {
            selectedLayer: null,
            selectedTime: null,
            selectedDepth: null,
            currentOpacity: 0.8,
            wcsMap: null,
            wcsDrawnItems: null,
            wcsBoundingBox: null,
            wmsLayer: null
        };

        this.layerOptions = config.layerOptions || [];
        this.depthLevels = config.depthLevels || [];
        this.timeSteps = config.timeSteps || 24;
        this.wcsLayer = config.wcsLayer || config.name;
        this.modalId = config.modalId || 'wcs-modal';

        // Event listener references for cleanup
        this._listeners = {
            layerSelect: null,
            depthSelect: null,
            timeSelect: null,
            opacity: null,
            clearBbox: null,
            mapDraw: [],
            controls: []
        };
    }

    /**
     * Cache DOM elements - extends base implementation
     */
    cacheElements() {
        super.cacheElements();

        // WCS modal elements
        this.elements.wcsModal = document.getElementById(this.modalId);
        this.elements.wcsModalTitle = document.getElementById(`${this.modalId}-title`);
        this.elements.wcsLayerSelect = document.getElementById(`${this.modalId}-layer`);
        this.elements.wcsTimeSelect = document.getElementById(`${this.modalId}-time`);
        this.elements.wcsDepthSelect = document.getElementById(`${this.modalId}-depth`);
        this.elements.wcsFilterMap = document.getElementById(`${this.modalId}-filter-map`);
        this.elements.wcsResultMap = document.getElementById(`${this.modalId}-result-map`);
        this.elements.wcsClearBbox = document.getElementById(`${this.modalId}-clear-bbox`);
        this.elements.wcsBboxDisplay = document.getElementById(`${this.modalId}-bbox-display`);
        this.elements.wcsStatus = document.getElementById(`${this.modalId}-status`);
        this.elements.wcsValueDisplay = document.getElementById(`${this.modalId}-value-display`);
        this.elements.wcsLegend = document.getElementById(`${this.modalId}-legend`);
        this.elements.wcsOpacity = document.getElementById(`${this.modalId}-opacity`);
    }

    /**
     * Initialize layer controls
     */
    initializeLayerControls() {
        // Populate layer select
        if (this.elements.wcsLayerSelect) {
            this.elements.wcsLayerSelect.innerHTML = '';
            this.layerOptions.forEach((layer, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = layer.label;
                this.elements.wcsLayerSelect.appendChild(option);
            });

            // Select first layer by default
            if (this.layerOptions.length > 0) {
                this.wcsState.selectedLayer = this.layerOptions[0];
                this.updateColorScale(this.layerOptions[0]);
            }

            this._listeners.layerSelect = (e) => {
                const index = parseInt(e.target.value, 10);
                this.wcsState.selectedLayer = this.layerOptions[index];
                this.updateColorScale(this.wcsState.selectedLayer);
                this.refreshWCSLayer();
            };
            this.elements.wcsLayerSelect.addEventListener('change', this._listeners.layerSelect);
        }

        // Initialize depth select (if applicable)
        if (this.elements.wcsDepthSelect && this.depthLevels.length > 0) {
            this.elements.wcsDepthSelect.innerHTML = '';
            this.depthLevels.forEach((level) => {
                const option = document.createElement('option');
                option.value = level.value;
                option.textContent = level.label;
                this.elements.wcsDepthSelect.appendChild(option);
            });

            this._listeners.depthSelect = (e) => {
                this.wcsState.selectedDepth = e.target.value;
                this.refreshWCSLayer();
            };
            this.elements.wcsDepthSelect.addEventListener('change', this._listeners.depthSelect);
        } else if (this.elements.wcsDepthSelect) {
            this.elements.wcsDepthSelect.parentElement.style.display = 'none';
        }

        // Initialize opacity control
        if (this.elements.wcsOpacity) {
            this._listeners.opacity = (e) => {
                this.wcsState.currentOpacity = parseFloat(e.target.value);
                if (this.wcsState.wmsLayer) {
                    this.wcsState.wmsLayer.setOpacity(this.wcsState.currentOpacity);
                }
            };
            this.elements.wcsOpacity.addEventListener('input', this._listeners.opacity);
        }

        // Initialize clear bbox button
        if (this.elements.wcsClearBbox) {
            this._listeners.clearBbox = () => this.clearWCSBoundingBox();
            this.elements.wcsClearBbox.addEventListener('click', this._listeners.clearBbox);
        }
    }

    /**
     * Initialize WCS map
     */
    initializeWCSMap() {
        if (!this.elements.wcsFilterMap || !this.elements.wcsResultMap) return;

        // Filter map (for selecting bbox)
        this.wcsState.wcsMap = L.map(this.elements.wcsFilterMap.id).setView([43.0, -8.0], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.wcsState.wcsMap);

        this.wcsState.wcsDrawnItems = new L.FeatureGroup();
        this.wcsState.wcsMap.addLayer(this.wcsState.wcsDrawnItems);

        // Add draw control
        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                rectangle: {
                    shapeOptions: {
                        color: '#3b7eff',
                        weight: 2,
                        fillOpacity: 0.2
                    }
                },
                polygon: false,
                circle: false,
                marker: false,
                polyline: false,
                circlemarker: false
            },
            edit: {
                featureGroup: this.wcsState.wcsDrawnItems,
                remove: true
            }
        });
        this.wcsState.wcsMap.addControl(drawControl);

        // Handle draw events
        this._listeners.mapDraw.created = (event) => {
            this.wcsState.wcsDrawnItems.clearLayers();
            this.wcsState.wcsDrawnItems.addLayer(event.layer);

            const bounds = event.layer.getBounds();
            this.wcsState.wcsBoundingBox = {
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast()
            };

            this.updateWCSBboxDisplay();
        };

        this._listeners.mapDraw.edited = (event) => {
            const layers = event.layers;
            layers.eachLayer((layer) => {
                const bounds = layer.getBounds();
                this.wcsState.wcsBoundingBox = {
                    south: bounds.getSouth(),
                    west: bounds.getWest(),
                    north: bounds.getNorth(),
                    east: bounds.getEast()
                };
            });
            this.updateWCSBboxDisplay();
        };

        this._listeners.mapDraw.deleted = () => {
            this.wcsState.wcsBoundingBox = null;
            this.updateWCSBboxDisplay();
        };

        this.wcsState.wcsMap.on(L.Draw.Event.CREATED, this._listeners.mapDraw.created);
        this.wcsState.wcsMap.on(L.Draw.Event.EDITED, this._listeners.mapDraw.edited);
        this.wcsState.wcsMap.on(L.Draw.Event.DELETED, this._listeners.mapDraw.deleted);
    }

    /**
     * Update time slider with available times
     * @param {Array} times - Array of time strings
     */
    updateTimeSlider(times) {
        if (!this.elements.wcsTimeSelect || !times || times.length === 0) return;

        this.elements.wcsTimeSelect.innerHTML = '';

        times.forEach((time) => {
            const option = document.createElement('option');
            option.value = time;

            // Format time for display
            const date = new Date(time);
            option.textContent = date.toLocaleString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            this.elements.wcsTimeSelect.appendChild(option);
        });

        // Select first time
        this.wcsState.selectedTime = times[0];

        this._listeners.timeSelect = (e) => {
            this.wcsState.selectedTime = e.target.value;
            this.refreshWCSLayer();
        };
        this.elements.wcsTimeSelect.addEventListener('change', this._listeners.timeSelect);
    }

    /**
     * Update color scale legend
     * @param {Object} layerConfig - Layer configuration with colors array
     */
    updateColorScale(layerConfig) {
        if (!this.elements.wcsLegend || !layerConfig.colors) return;

        const colors = layerConfig.colors;
        const gradient = colors.map((c, i) => {
            const pct = (i / (colors.length - 1)) * 100;
            return `rgb(${c[0]}, ${c[1]}, ${c[2]}) ${pct}%`;
        }).join(', ');

        this.elements.wcsLegend.innerHTML = `
            <div class="legend-gradient" style="
                background: linear-gradient(to right, ${gradient});
                height: 20px;
                border-radius: 4px;
                margin-bottom: 5px;
            "></div>
            <div class="legend-labels" style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>Min</span>
                <span>${layerConfig.legendLabel || layerConfig.label}</span>
                <span>Max</span>
            </div>
        `;
    }

    /**
     * Load WCS layer
     */
    async loadWCSLayer() {
        if (!this.wcsState.selectedLayer || !this.wcsState.wcsBoundingBox) {
            this.setWCSStatus('Select an area and layer', 'warning');
            return;
        }

        this.setWCSStatus('Loading layer...', 'loading');

        try {
            const bbox = this.wcsState.wcsBoundingBox;
            const bboxStr = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;

            // Build WMS URL
            const params = new URLSearchParams();
            params.append('service', 'WMS');
            params.append('version', '1.1.0');
            params.append('request', 'GetMap');
            params.append('layers', this.wcsLayer);
            params.append('styles', '');
            params.append('format', 'image/png');
            params.append('transparent', 'true');
            params.append('width', '512');
            params.append('height', '512');
            params.append('bbox', bboxStr);
            params.append('srs', 'EPSG:4326');

            if (this.wcsState.selectedTime) {
                params.append('time', this.wcsState.selectedTime);
            }

            if (this.wcsState.selectedDepth) {
                params.append('elevation', this.wcsState.selectedDepth);
            }

            const url = await ApiService.fetchWMSLayer(this.wcsLayer, {
                bbox: bboxStr,
                width: 512,
                height: 512,
                time: this.wcsState.selectedTime,
                elevation: this.wcsState.selectedDepth
            });

            // Remove existing layer
            if (this.wcsState.wmsLayer) {
                this.wcsState.wcsMap.removeLayer(this.wcsState.wmsLayer);
            }

            // Add new layer
            this.wcsState.wmsLayer = L.imageOverlay(url, [
                [bbox.south, bbox.west],
                [bbox.north, bbox.east]
            ], {
                opacity: this.wcsState.currentOpacity
            }).addTo(this.wcsState.wcsMap);

            this.setWCSStatus('Layer loaded', 'success');

        } catch (error) {
            Logger.error('Error loading WCS layer:', error);
            this.setWCSStatus('Error loading layer', 'error');
        }
    }

    /**
     * Refresh WCS layer (after parameter change)
     */
    refreshWCSLayer() {
        if (this.wcsState.wmsLayer) {
            this.loadWCSLayer();
        }
    }

    /**
     * Clear WCS bounding box
     */
    clearWCSBoundingBox() {
        if (this.wcsState.wcsDrawnItems) {
            this.wcsState.wcsDrawnItems.clearLayers();
        }
        this.wcsState.wcsBoundingBox = null;
        this.updateWCSBboxDisplay();

        if (this.wcsState.wmsLayer) {
            this.wcsState.wcsMap.removeLayer(this.wcsState.wmsLayer);
            this.wcsState.wmsLayer = null;
        }
    }

    /**
     * Update WCS bbox display
     */
    updateWCSBboxDisplay() {
        if (!this.elements.wcsBboxDisplay) return;

        if (this.wcsState.wcsBoundingBox) {
            const { north, south, east, west } = this.wcsState.wcsBoundingBox;
            this.elements.wcsBboxDisplay.innerHTML = `
                <strong>Selected area:</strong><br>
                N: ${north.toFixed(4)}° | S: ${south.toFixed(4)}°<br>
                E: ${east.toFixed(4)}° | W: ${west.toFixed(4)}°
            `;
            this.elements.wcsBboxDisplay.classList.add('bbox-display--active');
        } else {
            this.elements.wcsBboxDisplay.innerHTML = '<em>No area selected</em>';
            this.elements.wcsBboxDisplay.classList.remove('bbox-display--active');
        }
    }

    /**
     * Set WCS status message
     * @param {string} message - Status message
     * @param {string} type - Status type
     */
    setWCSStatus(message, type = 'info') {
        if (!this.elements.wcsStatus) return;
        this.elements.wcsStatus.textContent = message;
        this.elements.wcsStatus.className = `status status--${type}`;
    }

    /**
     * Open WCS modal
     */
    openWCSModal() {
        if (!this.elements.wcsModal) return;

        this.elements.wcsModal.hidden = false;
        document.body.classList.add('modal-open');

        // Initialize map if not already done
        if (!this.wcsState.wcsMap) {
            setTimeout(() => {
                this.initializeWCSMap();
                this.initializeLayerControls();
            }, 100);
        } else {
            setTimeout(() => {
                this.wcsState.wcsMap.invalidateSize();
            }, 100);
        }
    }

    /**
     * Close WCS modal
     */
    closeWCSModal() {
        if (!this.elements.wcsModal) return;

        this.elements.wcsModal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    /**
     * Remove all event listeners
     * @private
     */
    _removeAllListeners() {
        // Remove layer select listener
        if (this.elements.wcsLayerSelect && this._listeners.layerSelect) {
            this.elements.wcsLayerSelect.removeEventListener('change', this._listeners.layerSelect);
        }

        // Remove depth select listener
        if (this.elements.wcsDepthSelect && this._listeners.depthSelect) {
            this.elements.wcsDepthSelect.removeEventListener('change', this._listeners.depthSelect);
        }

        // Remove time select listener
        if (this.elements.wcsTimeSelect && this._listeners.timeSelect) {
            this.elements.wcsTimeSelect.removeEventListener('change', this._listeners.timeSelect);
        }

        // Remove opacity listener
        if (this.elements.wcsOpacity && this._listeners.opacity) {
            this.elements.wcsOpacity.removeEventListener('input', this._listeners.opacity);
        }

        // Remove clear bbox listener
        if (this.elements.wcsClearBbox && this._listeners.clearBbox) {
            this.elements.wcsClearBbox.removeEventListener('click', this._listeners.clearBbox);
        }

        // Remove map draw listeners
        if (this.wcsState.wcsMap) {
            if (this._listeners.mapDraw.created) {
                this.wcsState.wcsMap.off(L.Draw.Event.CREATED, this._listeners.mapDraw.created);
            }
            if (this._listeners.mapDraw.edited) {
                this.wcsState.wcsMap.off(L.Draw.Event.EDITED, this._listeners.mapDraw.edited);
            }
            if (this._listeners.mapDraw.deleted) {
                this.wcsState.wcsMap.off(L.Draw.Event.DELETED, this._listeners.mapDraw.deleted);
            }
        }

        // Clear listener references
        this._listeners = {
            layerSelect: null,
            depthSelect: null,
            timeSelect: null,
            opacity: null,
            clearBbox: null,
            mapDraw: [],
            controls: []
        };
    }

    /**
     * Destroy WCS viewer
     */
    destroy() {
        this._removeAllListeners();

        if (this.wcsState.wmsLayer) {
            this.wcsState.wcsMap.removeLayer(this.wcsState.wmsLayer);
        }

        if (this.wcsState.wcsMap) {
            this.wcsState.wcsMap.remove();
        }

        this.wcsState = {
            selectedLayer: null,
            selectedTime: null,
            selectedDepth: null,
            currentOpacity: 0.8,
            wcsMap: null,
            wcsDrawnItems: null,
            wcsBoundingBox: null,
            wmsLayer: null
        };

        super.destroy();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WCSViewer };
}

// Expose to global scope for browser
window.WCSViewer = WCSViewer;

