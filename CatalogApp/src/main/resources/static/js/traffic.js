'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // DOM REFERENCES
    // ============================================
    const form = document.getElementById('search-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const proceduresInput = document.getElementById('procedures');
    const statusEl = document.getElementById('status');
    const availabilitySection = document.getElementById('availability-section');
    const resultsSection = document.getElementById('results');
    const searchButton = document.getElementById('search-button');
    const clearBboxButton = document.getElementById('clear-bbox');
    const bboxDisplay = document.getElementById('bbox-display');
    const backLink = document.getElementById('back-link');
    const pageTitle = document.getElementById('page-title');
    const featureModal = document.getElementById('feature-modal');
    const featureModalContent = document.getElementById('feature-modal-content');
    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('traffic-chart');
    const processCheckboxesContainer = document.getElementById('process-checkboxes');
    const selectAllProcsBtn = document.getElementById('select-all-procs');
    const deselectAllProcsBtn = document.getElementById('deselect-all-procs');
    const downloadChartBtn = document.getElementById('download-chart');
    const chartMetadata = document.getElementById('chart-metadata');

    // ============================================
    // STATE
    // ============================================
    let currentBoundingBox = null;
    let availabilityFetchTimeout = null;
    let availabilityController = null;
    let currentProcess = null;
    let currentChart = null;
    let currentChartData = null;
    let resultsMap = null;
    let resultsMapLayer = null;
    let resultsMapIdCounter = 0;
    let resultsMapInitialBounds = null;
    let resultsMapInitialCenter = null;
    let resultsMapInitialZoom = null;
    const roadNameCache = new Map();
    const roadNamePending = new Map();
    const roadArcCache = new Map();
    const roadArcPending = new Map();

    const C = SHARED_CONSTANTS;
    const DEFAULT_SCHEMA = 'traffic';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 1500;

    // ============================================
    // PROCESS CONFIGURATION (traffic-specific)
    // ============================================
    const PROCESS_CONFIG = {
        'traffic_sensor': {
            wfsLayer: 'ccmm:observation_traffic_sensor_wfs',
            valueProperties: [
                { property: 'flow', displayName: 'Flow (vehicles/hour)', unit: 'veh/h' },
                { property: 'occupancy', displayName: 'Occupancy', unit: '%' }
            ],
            displayName: 'Traffic sensor',
            pageTitle: 'Traffic data - Sensors',
            geometryType: 'Point'
        },
        'traffic_flow_model': {
            wfsLayer: 'ccmm:observation_traffic_flow_model_wfs',
            valueProperties: [
                { property: 'flow', displayName: 'Flow (vehicles/hour)', unit: 'veh/h' }
            ],
            displayName: 'Traffic flow model',
            pageTitle: 'Traffic data - Flow model',
            geometryType: 'LineString'
        }
    };

    // ============================================
    // URL PARAMETERS & INITIALIZATION
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema');
    const nameParam = urlParams.get('name');
    const procedureParam = urlParams.get('procedure');
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    const schema = (schemaParam || DEFAULT_SCHEMA).trim() || DEFAULT_SCHEMA;

    // Update the back-to-process link
    if (backLink) {
        const backName = nameParam || 'traffic_sensor';
        backLink.href = `process-type.html?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(backName)}`;
    }

    // Detect and load the process configuration
    if (nameParam && PROCESS_CONFIG[nameParam]) {
        currentProcess = PROCESS_CONFIG[nameParam];
        document.title = `Lendas - ${currentProcess.pageTitle}`;
        if (pageTitle) {
            pageTitle.textContent = currentProcess.displayName;
        }
    } else if (nameParam) {
        DomHelpers.setStatus(statusEl, `Unsupported process: ${nameParam}`, 'error');
        searchButton.disabled = true;
        if (startDateInput) startDateInput.disabled = true;
        if (endDateInput) endDateInput.disabled = true;
        if (proceduresInput) proceduresInput.disabled = true;
        DomHelpers.renderEmptyState(resultsSection, `Process "${nameParam}" is not supported. Available processes: ${Object.keys(PROCESS_CONFIG).join(', ')}`);
        return;
    } else {
        // Default to traffic_sensor when name is not specified
        currentProcess = PROCESS_CONFIG['traffic_sensor'];
        document.title = 'Lendas - Traffic data - Sensors';
        if (pageTitle) {
            pageTitle.textContent = 'Traffic sensors';
        }
    }

    form.dataset.schema = schema;
    form.dataset.name = nameParam || 'traffic_sensor';
    if (procedureParam) proceduresInput.value = procedureParam;

    if (startDateParam) {
        const normalized = normalizeDateTimeInput(startDateParam);
        if (normalized) startDateInput.value = normalized;
    }
    if (endDateParam) {
        const normalized = normalizeDateTimeInput(endDateParam);
        if (normalized) endDateInput.value = normalized;
    }

    // ============================================
    // MAP INITIALIZATION (shared)
    // ============================================
    const { map, drawnItems, availabilityLayer } = MapManager.initializeMap('map');
    const availabilityStyling = AvailabilityStyle.createController(map, {
        colorStops: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a']
    });

    MapManager.setupDrawHandlers(map, drawnItems, (newBbox) => {
        currentBoundingBox = newBbox;
        MapManager.updateBboxDisplay(bboxDisplay, currentBoundingBox);
        scheduleAvailabilityRefresh();
    });

    MapManager.updateBboxDisplay(bboxDisplay, currentBoundingBox);

    clearBboxButton.addEventListener('click', () => {
        drawnItems.clearLayers();
        currentBoundingBox = null;
        MapManager.updateBboxDisplay(bboxDisplay, currentBoundingBox);
        scheduleAvailabilityRefresh();
    });

    startDateInput.addEventListener('change', scheduleAvailabilityRefresh);
    endDateInput.addEventListener('change', scheduleAvailabilityRefresh);
    proceduresInput.addEventListener('change', scheduleAvailabilityRefresh);

    // ============================================
    // AVAILABILITY (shared)
    // ============================================
    function scheduleAvailabilityRefresh(force = false) {
        if (availabilityFetchTimeout) clearTimeout(availabilityFetchTimeout);
        const delay = force ? 0 : C.AVAILABILITY_DEBOUNCE_MS;
        availabilityFetchTimeout = setTimeout(() => {
            availabilityFetchTimeout = null;
            fetchAvailability();
        }, delay);
    }

    async function fetchAvailability() {
        const schema = form.dataset.schema;
        const name = form.dataset.name;
        const procedures = proceduresInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!schema || !name || !startDate || !endDate) return;

        if (new Date(startDate) > new Date(endDate)) {
            DomHelpers.setStatus(statusEl, 'Invalid time range for availability.', 'error');
            return;
        }

        if (!procedures && !currentBoundingBox) {
            availabilityLayer.clearLayers();
            availabilityStyling.clearLegend();
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
            DomHelpers.setStatus(statusEl, 'For availability, enter processes or draw a BBOX.', 'info');
            return;
        }

        if (availabilityController) availabilityController.abort();
        availabilityController = new AbortController();

        try {
            DomHelpers.setStatus(statusEl, 'Querying availability...', 'loading');
            const availability = await WfsClient.fetchAvailability(
                {
                    schema,
                    name,
                    procedures,
                    startTime: formatDateTimeForRequest(startDate),
                    endTime: formatDateTimeForRequest(endDate),
                    bbox: currentBoundingBox
                },
                availabilityController.signal
            );

            const hasFeatures = availability?.geometries?.features?.length > 0;
            const hasPeriods = availability?.periods?.length > 0;

            if (!hasFeatures && !hasPeriods) {
                DomHelpers.setStatus(statusEl, 'No data available for the selected criteria.', 'info');
                availabilityLayer.clearLayers();
                availabilityStyling.clearLegend();
                AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
                return;
            }

            renderGeometries(availability?.geometries);
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, availability?.periods);
            DomHelpers.setStatus(statusEl, `Availability loaded: ${availability.periods?.length || 0} periods, ${availability.geometries?.features?.length || 0} locations.`, 'success');
        } catch (error) {
            if (error.name === 'AbortError') return;
            Logger.error('Error fetching availability:', error);
            availabilityLayer.clearLayers();
            availabilityStyling.clearLegend();
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
            DomHelpers.setStatus(statusEl, 'Availability could not be retrieved.', 'error');
        } finally {
            availabilityController = null;
        }
    }

    function renderGeometries(geometries) {
        if (!geometries || !Array.isArray(geometries.features)) return;

        availabilityLayer.clearLayers();
        const availabilityStats = availabilityStyling.computeStats(geometries);

        const geoJsonLayer = L.geoJSON(geometries, {
            pointToLayer: (feature, latlng) => {
                const baseStyle = availabilityStyling.getPointStyle(feature, availabilityStats);
                return L.circleMarker(latlng, {
                    ...baseStyle,
                    radius: baseStyle.radius + 1.5,
                    color: '#0f172a',
                    weight: 2.4,
                    fillOpacity: 0.96,
                    opacity: 1
                });
            },
            style: (feature) => availabilityStyling.getFeatureStyle(feature, availabilityStats),
            onEachFeature: (feature, layer) => {
                if (layer.bindTooltip) {
                    layer.bindTooltip(createObservationsTooltip(feature), {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'traffic-trajectory-tooltip'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.setStyle) {
                        layer.setStyle(availabilityStyling.getHoverFeatureStyle(feature, availabilityStats));
                    }
                    if (layer.openTooltip) {
                        layer.openTooltip();
                    }
                    if (layer.bringToFront) {
                        layer.bringToFront();
                    }
                });

                layer.on('mouseout', () => {
                    if (geoJsonLayer.resetStyle && layer.setStyle) {
                        geoJsonLayer.resetStyle(layer);
                    }
                    if (layer.closeTooltip) {
                        layer.closeTooltip();
                    }
                });
            }
        });

        geoJsonLayer.addTo(availabilityLayer);
        availabilityStyling.updateLegend(availabilityStats);
        if (geoJsonLayer.getBounds().isValid()) {
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [30, 30] });
        }
    }

    function createObservationsTooltip(feature) {
        const props = feature?.properties || {};
        const observations = props.observations ?? '—';
        return `
            <div class="traffic-popup traffic-popup--trajectory">
                <div class="traffic-tooltip-row">
                    <span class="traffic-tooltip-key">Observations</span>
                    <span class="traffic-tooltip-value">${sanitize(String(observations))}</span>
                </div>
            </div>
        `;
    }

    scheduleAvailabilityRefresh(true);

    // ============================================
    // FORM SUBMISSION & WFS QUERY
    // ============================================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const procedures = (formData.get('procedures') || '').trim();
        const startDate = formData.get('start-date');
        const endDate = formData.get('end-date');

        if (!startDate || !endDate) {
            DomHelpers.setStatus(statusEl, 'Please select start and end dates.', 'error');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            DomHelpers.setStatus(statusEl, 'The start date cannot be later than the end date.', 'error');
            return;
        }
        if (!procedures && !currentBoundingBox) {
            DomHelpers.setStatus(statusEl, 'Enter at least one process or select a BBOX to limit the search.', 'error');
            return;
        }

        DomHelpers.setStatus(statusEl, `Querying ${currentProcess?.displayName || 'traffic'} data...`, 'loading');
        destroyResultsMap();
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const typeName = currentProcess ? currentProcess.wfsLayer : 'ccmm:observation_traffic_sensor_wfs';
            const wfsUrl = WfsClient.buildUrl(typeName, {
                bbox: currentBoundingBox,
                startDate,
                endDate,
                procedures
            });
            const data = await WfsClient.fetchData(wfsUrl);

            if (!data || !Array.isArray(data.features) || data.features.length === 0) {
                destroyResultsMap();
                DomHelpers.renderEmptyState(resultsSection, 'No traffic data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${data.features.length} traffic observations.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Error fetching traffic data:', error);
            destroyResultsMap();
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying traffic data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
        }
    });

    // ============================================
    // RESULTS RENDERING (traffic-specific)
    // ============================================
    function renderResults(featureCollection) {
        destroyResultsMap();
        resultsSection.innerHTML = '';

        const allFeatures = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        const features = allFeatures.slice(0, MAX_RENDERED_ROWS);

        const resultsSummary = document.createElement('div');
        resultsSummary.className = 'results-summary';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'results-summary__header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = 'Query results';

        const viewChartBtn = document.createElement('button');
        viewChartBtn.type = 'button';
        viewChartBtn.className = 'chart-control-btn chart-control-btn--primary';
        viewChartBtn.textContent = 'View chart';
        viewChartBtn.addEventListener('click', () => openChartModal(features));

        headerDiv.appendChild(titleEl);
        headerDiv.appendChild(viewChartBtn);

        // Add export button below chart button
        const exportBtn = CsvExporter.createButton(() => {
            const processName = currentProcess ? currentProcess.name : 'traffic';
            CsvExporter.exportFeatures(allFeatures, `${processName}-observations`, {
                fieldOrder: ['procedure', 'result_time', 'feature_of_interest', 'flow', 'occupancy'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time: 'Date',
                    feature_of_interest: 'FeatureOfInterest',
                    flow: 'Flow',
                    occupancy: 'Occupancy'
                }
            });
        });
        exportBtn.style.marginTop = '0.5rem';
        headerDiv.appendChild(exportBtn);

        resultsSummary.appendChild(headerDiv);

        const subtitleEl = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(allFeatures.length);
        subtitleEl.append('Found ', countStrong, ' traffic observations');
        resultsSummary.appendChild(subtitleEl);

        if (allFeatures.length > MAX_RENDERED_ROWS) {
            const noteEl = document.createElement('p');
            noteEl.className = 'results-summary__note';
            noteEl.textContent = `Showing ${MAX_RENDERED_ROWS} rows to keep the interface responsive.`;
            resultsSummary.appendChild(noteEl);
        }

        resultsSection.appendChild(resultsSummary);

        const resultsMapPanel = document.createElement('section');
        resultsMapPanel.className = 'results-map-panel';

        const resultsMapTitle = document.createElement('h3');
        resultsMapTitle.className = 'results-map-panel__title';
        resultsMapTitle.textContent = 'Traffic result geometries';

        const resultsMapContainer = document.createElement('div');
        resultsMapContainer.className = 'results-map-panel__container';
        const mapContainerId = `results-map-${resultsMapIdCounter++}`;
        resultsMapContainer.id = mapContainerId;

        resultsMapPanel.appendChild(resultsMapTitle);
        resultsMapPanel.appendChild(resultsMapContainer);
        resultsSection.appendChild(resultsMapPanel);

        renderResultsMap(mapContainerId, featureCollection);

        const list = document.createElement('div');
        list.className = 'traffic-feature-list';

        const createRow = (cells, isHeader = false) => {
            const row = document.createElement('div');
            row.className = `traffic-grid-row${isHeader ? ' traffic-grid-row--header' : ''}`;
            cells.forEach((content) => {
                const cell = document.createElement('span');
                cell.className = isHeader
                    ? 'traffic-grid-row__cell traffic-grid-row__cell--header'
                    : 'traffic-grid-row__cell';

                if (content instanceof HTMLElement) {
                    cell.appendChild(content);
                } else {
                    cell.textContent = content;
                }
                row.appendChild(cell);
            });
            return row;
        };

        // Header row
        const headerCells = ['Process', 'Date'];
        if (currentProcess?.valueProperties) {
            currentProcess.valueProperties.forEach(vp => headerCells.push(vp.displayName));
        }
        list.appendChild(createRow(headerCells, true));

        // Data rows
        features.forEach((feature) => {
            const props = feature?.properties || {};
            const procedure = formatValue(props.procedure);
            const resultTime = formatDateTime(props.result_time);
            const rowCells = [procedure, resultTime];

            if (currentProcess?.valueProperties) {
                currentProcess.valueProperties.forEach(vp => {
                    const value = props[vp.property];
                    rowCells.push(formatValue(value));
                });
            }

            list.appendChild(createRow(rowCells));
        });

        resultsSection.appendChild(list);
    }

    function destroyResultsMap() {
        if (resultsMap) {
            resultsMap.remove();
            resultsMap = null;
        }
        resultsMapLayer = null;
        resultsMapInitialBounds = null;
        resultsMapInitialCenter = null;
        resultsMapInitialZoom = null;
    }

    function extractFeatureOfInterest(feature) {
        const raw = feature?.properties?.feature_of_interest ?? feature?.properties?.featureOfInterest;
        if (raw === null || raw === undefined || String(raw).trim() === '') return null;
        return String(raw).trim();
    }

    function createRoadNameTooltip(roadName = '—') {
        return `
            <div class="traffic-popup traffic-popup--trajectory">
                <div class="traffic-tooltip-row">
                    <span class="traffic-tooltip-key">Name</span>
                    <span class="traffic-tooltip-value">${sanitize(String(roadName))}</span>
                </div>
            </div>
        `;
    }

    function createRoadArcTooltip(roadArc = null) {
        const code = roadArc?.code ? String(roadArc.code) : '—';
        const inverted = (roadArc && roadArc.inverted !== undefined && roadArc.inverted !== null)
            ? String(roadArc.inverted)
            : '—';

        return `
            <div class="traffic-popup traffic-popup--trajectory">
                <div class="traffic-tooltip-row">
                    <span class="traffic-tooltip-key">Code</span>
                    <span class="traffic-tooltip-value">${sanitize(code)}</span>
                </div>
                <div class="traffic-tooltip-row">
                    <span class="traffic-tooltip-key">Inverted</span>
                    <span class="traffic-tooltip-value">${sanitize(inverted)}</span>
                </div>
            </div>
        `;
    }

    async function fetchRoadName(featureValue) {
        if (!featureValue) return null;
        if (roadNameCache.has(featureValue)) {
            return roadNameCache.get(featureValue);
        }
        if (roadNamePending.has(featureValue)) {
            return roadNamePending.get(featureValue);
        }

        const pending = ApiService.fetchFeatureOfInterest('traffic', 'road', featureValue)
            .then((payload) => {
                const item = Array.isArray(payload) ? payload[0] : payload;
                const roadName = item?.name ? String(item.name) : null;
                roadNameCache.set(featureValue, roadName);
                return roadName;
            })
            .catch((error) => {
                Logger.warn(`Could not resolve road name for feature=${featureValue}:`, error);
                roadNameCache.set(featureValue, null);
                return null;
            })
            .finally(() => {
                roadNamePending.delete(featureValue);
            });

        roadNamePending.set(featureValue, pending);
        return pending;
    }

    async function fetchRoadArcContext(featureValue) {
        if (!featureValue) return null;
        if (roadArcCache.has(featureValue)) {
            return roadArcCache.get(featureValue);
        }
        if (roadArcPending.has(featureValue)) {
            return roadArcPending.get(featureValue);
        }

        const pending = ApiService.fetchFeatureOfInterest('traffic', 'road_arc', featureValue)
            .then((payload) => {
                const item = Array.isArray(payload) ? payload[0] : payload;
                const roadArc = item && typeof item === 'object'
                    ? {
                        code: item.code,
                        inverted: item.inverted
                    }
                    : null;
                roadArcCache.set(featureValue, roadArc);
                return roadArc;
            })
            .catch((error) => {
                Logger.warn(`Could not resolve road_arc for feature=${featureValue}:`, error);
                roadArcCache.set(featureValue, null);
                return null;
            })
            .finally(() => {
                roadArcPending.delete(featureValue);
            });

        roadArcPending.set(featureValue, pending);
        return pending;
    }

    function renderResultsMap(containerId, featureCollection) {
        destroyResultsMap();

        const container = document.getElementById(containerId);
        if (!container) return;

        const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        if (features.length === 0) return;

        const limitedFeatures = features.length > MAX_RENDERED_MAP_FEATURES
            ? features.slice(0, MAX_RENDERED_MAP_FEATURES)
            : features;
        const dataForMap = limitedFeatures.length === features.length
            ? featureCollection
            : { ...featureCollection, features: limitedFeatures };

        resultsMap = L.map(containerId, {
            zoomControl: true,
            preferCanvas: true
        });

        L.tileLayer(SHARED_CONSTANTS.OSM_TILE_URL, {
            attribution: SHARED_CONSTANTS.OSM_ATTRIBUTION,
            maxZoom: SHARED_CONSTANTS.MAP_MAX_ZOOM
        }).addTo(resultsMap);

        const defaultStyle = {
            color: '#0f766e',
            weight: 2.5,
            opacity: 0.9
        };
        const hoverStyle = {
            color: '#0b4f4a',
            weight: 4,
            opacity: 1
        };

        const isTrafficSensor = form?.dataset?.name === 'traffic_sensor';
        const isTrafficFlowModel = form?.dataset?.name === 'traffic_flow_model';

        resultsMapLayer = L.geoJSON(dataForMap, {
            style: defaultStyle,
            pointToLayer: (feature, latlng) => {
                const count = feature?.properties?.observations;
                return L.circleMarker(latlng, {
                    radius: SHARED_CONSTANTS.MARKER_BASE_RADIUS + Math.min(Number(count) || 0, 20) * 0.3,
                    fillColor: SHARED_CONSTANTS.MARKER_FILL_COLOR,
                    color: SHARED_CONSTANTS.MARKER_BORDER_COLOR,
                    weight: SHARED_CONSTANTS.MARKER_WEIGHT,
                    fillOpacity: SHARED_CONSTANTS.MARKER_FILL_OPACITY
                });
            },
            onEachFeature: (feature, layer) => {
                const foiValue = extractFeatureOfInterest(feature);

                if ((isTrafficSensor || isTrafficFlowModel) && layer.bindTooltip) {
                    const initialContent = isTrafficSensor
                        ? createRoadNameTooltip('—')
                        : createRoadArcTooltip(null);

                    layer.bindTooltip(initialContent, {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'traffic-trajectory-tooltip'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.setStyle) {
                        layer.setStyle(hoverStyle);
                    }
                    if (layer.bringToFront) {
                        layer.bringToFront();
                    }
                    if ((isTrafficSensor || isTrafficFlowModel) && layer.openTooltip) {
                        layer.openTooltip();
                    }

                    if (isTrafficSensor && foiValue) {
                        void fetchRoadName(foiValue).then((roadName) => {
                            if (layer.setTooltipContent) {
                                layer.setTooltipContent(createRoadNameTooltip(roadName || '—'));
                            }
                            if (layer.openTooltip) {
                                layer.openTooltip();
                            }
                        });
                    }

                    if (isTrafficFlowModel && foiValue) {
                        void fetchRoadArcContext(foiValue).then((roadArc) => {
                            if (layer.setTooltipContent) {
                                layer.setTooltipContent(createRoadArcTooltip(roadArc));
                            }
                            if (layer.openTooltip) {
                                layer.openTooltip();
                            }
                        });
                    }
                });

                layer.on('mouseout', () => {
                    if (resultsMapLayer?.resetStyle) {
                        resultsMapLayer.resetStyle(layer);
                    }
                    if ((isTrafficSensor || isTrafficFlowModel) && layer.closeTooltip) {
                        layer.closeTooltip();
                    }
                });
            }
        }).addTo(resultsMap);

        const bounds = resultsMapLayer.getBounds();
        if (bounds?.isValid()) {
            resultsMapInitialBounds = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
            resultsMap.fitBounds(bounds, { padding: [24, 24] });
        } else {
            resultsMapInitialCenter = [SHARED_CONSTANTS.MAP_CENTER[0], SHARED_CONSTANTS.MAP_CENTER[1]];
            resultsMapInitialZoom = SHARED_CONSTANTS.MAP_ZOOM;
            resultsMap.setView(resultsMapInitialCenter, resultsMapInitialZoom);
        }

        MapManager.addResetZoomControl(resultsMap, {
            title: 'Reset Zoom',
            label: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
            labelIsHtml: true,
            getView: () => {
                if (resultsMapInitialBounds) {
                    return { bounds: resultsMapInitialBounds, padding: [24, 24] };
                }
                return {
                    center: resultsMapInitialCenter || SHARED_CONSTANTS.MAP_CENTER,
                    zoom: Number.isFinite(resultsMapInitialZoom) ? resultsMapInitialZoom : SHARED_CONSTANTS.MAP_ZOOM
                };
            }
        });

        window.setTimeout(() => {
            if (resultsMap) {
                resultsMap.invalidateSize();
            }
        }, 0);
    }

    // ============================================
    // FEATURE MODAL (shared)
    // ============================================
    ModalManager.setupDismissHandlers(featureModal, () => {
        ModalManager.close(featureModal, {
            onClose: () => { if (featureModalContent) featureModalContent.innerHTML = ''; }
        });
    });

    // ============================================
    // CHART MODAL
    // ============================================
    if (selectAllProcsBtn) {
        selectAllProcsBtn.addEventListener('click', () => {
            ChartHelpers.toggleAll('#process-checkboxes', true, updateChart);
        });
    }
    if (deselectAllProcsBtn) {
        deselectAllProcsBtn.addEventListener('click', () => {
            ChartHelpers.toggleAll('#process-checkboxes', false, updateChart);
        });
    }
    if (downloadChartBtn) {
        downloadChartBtn.addEventListener('click', () => {
            ChartHelpers.downloadChart(currentChart, 'traffic-time-series');
        });
    }

    ModalManager.setupDismissHandlers(chartModal, closeChartModal);

    function openChartModal(features) {
        if (!chartModal || !features || features.length === 0) {
            Logger.error('Chart modal or data not available');
            return;
        }

        try {
            currentChartData = features;

            const chartModalTitle = document.getElementById('chart-modal-title');
            if (chartModalTitle && currentProcess) {
                chartModalTitle.textContent = `Time series - ${currentProcess.displayName}`;
            }

            if (chartMetadata) {
                const uniqueProcesses = [...new Set(features.map(f => f.properties?.procedure))];
                const dateRange = getDateRange(features);
                chartMetadata.innerHTML = `
                    <span><strong>Processes:</strong> ${uniqueProcesses.length}</span>
                    <span><strong>Observations:</strong> ${features.length}</span>
                    <span><strong>Period:</strong> ${sanitize(dateRange)}</span>
                `;
            }

            buildProcessCheckboxes(features);
            renderChart(features);
            ModalManager.open(chartModal);
        } catch (error) {
            Logger.error('Error opening chart modal:', error);
            notifications.error('Error loading chart data. Please try again.');
        }
    }

    function getDateRange(features) {
        const timestamps = features
            .map(f => f.properties?.result_time)
            .filter(Boolean)
            .map(t => new Date(t).getTime());

        if (timestamps.length === 0) return '—';

        const min = new Date(Math.min(...timestamps));
        const max = new Date(Math.max(...timestamps));
        return `${min.toLocaleDateString('en-US')} - ${max.toLocaleDateString('en-US')}`;
    }

    function buildProcessCheckboxes(features) {
        if (!processCheckboxesContainer) return;

        const processGroups = {};
        features.forEach(feature => {
            const proc = feature.properties?.procedure;
            if (proc) {
                if (!processGroups[proc]) processGroups[proc] = [];
                processGroups[proc].push(feature);
            }
        });

        ChartHelpers.buildProcessCheckboxes(processCheckboxesContainer, processGroups, C.PROCESS_COLORS, updateChart);
    }

    function renderChart(features) {
        if (!chartCanvas || !features) return;

        if (currentChart) currentChart.destroy();

        const selectedProcs = ChartHelpers.getSelectedValues('#process-checkboxes');
        let datasets = [];

        // Create datasets for each value property and process
        if (currentProcess?.valueProperties) {
            currentProcess.valueProperties.forEach((vp, vpIndex) => {
                features.forEach(feature => {
                    const proc = String(feature.properties?.procedure);
                    if (!selectedProcs.includes(proc)) return;

                    const value = feature.properties?.[vp.property];
                    if (value === C.WFS_INVALID_VALUE || value === null || value === undefined) return;

                    const datasetLabel = `${vp.displayName} (Proc ${proc})`;
                    let dataset = datasets.find(d => d.label === datasetLabel);

                    if (!dataset) {
                        const colorIndex = (vpIndex * selectedProcs.length + selectedProcs.indexOf(proc)) % C.PROCESS_COLORS.length;
                        const color = C.PROCESS_COLORS[colorIndex];
                        dataset = {
                            label: datasetLabel, data: [],
                            borderColor: color, backgroundColor: color + '20',
                            borderWidth: 2, pointRadius: 2, pointHoverRadius: 5,
                            pointBackgroundColor: color, pointBorderColor: '#ffffff', pointBorderWidth: 1,
                            fill: false, tension: 0.1, spanGaps: true,
                            _unit: vp.unit
                        };
                        datasets.push(dataset);
                    }

                    dataset.data.push({ x: feature.properties?.result_time, y: value });
                });
            });
        }

        // Sort data points by time
        datasets.forEach(ds => ds.data.sort((a, b) => new Date(a.x) - new Date(b.x)));
        ChartHelpers.enhanceLineDatasets(datasets);

        const tooltipConfig = ChartHelpers.getTooltipConfig();
        tooltipConfig.callbacks = {
            title: (context) => {
                const timestamp = context[0]?.parsed?.x;
                if (timestamp) {
                    return new Date(timestamp).toLocaleString('en-US', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    });
                }
                return '';
            },
            label: (context) => {
                const unit = context.dataset._unit || '';
                return `${context.dataset.label}: ${context.parsed.y} ${unit}`;
            }
        };

        const xAxis = ChartHelpers.getAxisConfig({ titleText: 'Date', type: 'time' });
        xAxis.time = {
            displayFormats: { hour: 'dd/MM HH:mm', day: 'dd/MM/yyyy', month: 'MM/yyyy' },
            tooltipFormat: 'Pp'
        };
        xAxis.ticks = { ...xAxis.ticks, maxRotation: 45 };

        currentChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: currentProcess ? `${currentProcess.displayName} - Time series` : 'Traffic - Time series',
                        font: { size: 16, weight: 'bold', family: C.CHART_FONT_FAMILY },
                        padding: 20, color: C.CHART_TITLE_COLOR
                    },
                    legend: {
                        display: true, position: 'top',
                        labels: {
                            boxWidth: 12, boxHeight: 12, padding: 12,
                            font: { size: 11, family: C.CHART_FONT_FAMILY },
                            color: C.CHART_TITLE_COLOR, usePointStyle: true
                        }
                    },
                    tooltip: tooltipConfig
                },
                scales: {
                    x: xAxis,
                    y: ChartHelpers.getAxisConfig({ titleText: 'Value' })
                }
            }
        });
    }

    function updateChart() {
        if (!currentChartData) return;
        renderChart(currentChartData);
    }

    function closeChartModal() {
        ModalManager.close(chartModal, {
            onClose: () => {
                if (currentChart) { currentChart.destroy(); currentChart = null; }
                currentChartData = null;
                if (processCheckboxesContainer) processCheckboxesContainer.innerHTML = '';
                if (chartMetadata) chartMetadata.innerHTML = '';
            }
        });
    }
});

