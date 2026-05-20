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
    const chartCanvas = document.getElementById('vertical-profile-chart');
    const variableCheckboxesContainer = document.getElementById('variable-checkboxes');
    const selectAllVarsBtn = document.getElementById('select-all-vars');
    const deselectAllVarsBtn = document.getElementById('deselect-all-vars');
    const downloadChartBtn = document.getElementById('download-chart');
    const chartMetadata = document.getElementById('chart-metadata');

    // ============================================
    // STATE
    // ============================================
    let currentBoundingBox = null;
    let availabilityFetchTimeout = null;
    let availabilityController = null;
    let currentChart = null;
    let currentChartData = null;
    let resultsMap = null;
    let resultsMapLayer = null;
    let resultsMapIdCounter = 0;
    let resultsMapInitialBounds = null;
    let resultsMapInitialCenter = null;
    let resultsMapInitialZoom = null;
    const featureContextCache = new Map();
    const featureContextPending = new Map();

    // ============================================
    // CTD-SPECIFIC CONFIGURATION
    // ============================================
    const EXPECTED_SCHEMA = 'ctd_intecmar';
    const EXPECTED_NAME = 'configuracion_ctd';
    const FEATURE_OF_INTEREST_NAME = 'estacion';
    const WFS_TYPE_NAME = 'ccmm:observation_configuracion_ctd_wfs';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 1500;

    const VARIABLE_CONFIG = {
        temperatura_its90: { label: 'Temperature ITS-90 (°C)', color: '#ef4444', borderWidth: 2 },
        salinidad: { label: 'Salinity (PSU)', color: '#3b82f6', borderWidth: 2 },
        presion: { label: 'Pressure (dbar)', color: '#8b5cf6', borderWidth: 2 },
        ph: { label: 'pH', color: '#10b981', borderWidth: 2 },
        oxigeno: { label: 'Oxygen (mg/L)', color: '#f59e0b', borderWidth: 2 },
        transmitancia: { label: 'Transmittance (%)', color: '#06b6d4', borderWidth: 2 },
        irradiancia: { label: 'Irradiance (W/m²)', color: '#f97316', borderWidth: 2 },
        flourescencia_uv: { label: 'UV fluorescence', color: '#ec4899', borderWidth: 2 },
        flourescencia: { label: 'Fluorescence', color: '#a855f7', borderWidth: 2 },
        densidad: { label: 'Density (kg/m³)', color: '#14b8a6', borderWidth: 2 },
        profundidad: { label: 'Depth (m)', color: '#6366f1', borderWidth: 2 },
        temperatura_its68: { label: 'Temperature ITS-68 (°C)', color: '#dc2626', borderWidth: 2 },
        conductividad: { label: 'Conductivity (S/m)', color: '#0891b2', borderWidth: 2 },
        validacion: { label: 'Validation flags', color: '#64748b', borderWidth: 2 }
    };

    const DEFAULT_SELECTED = ['salinidad'];

    // ============================================
    // URL PARAMETERS & INITIALIZATION
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema');
    const nameParam = urlParams.get('name');
    const procedureParam = urlParams.get('procedure');
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    const schema = (schemaParam || EXPECTED_SCHEMA).trim() || EXPECTED_SCHEMA;
    const name = (nameParam || EXPECTED_NAME).trim() || EXPECTED_NAME;

    form.dataset.schema = schema;
    form.dataset.name = name;
    if (procedureParam) proceduresInput.value = procedureParam;

    if (backLink) {
        backLink.href = `process-type.html?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
    }

    if (pageTitle) {
        pageTitle.textContent = 'CTD data query';
    }
    document.title = 'Lendas - CTD data query';

    if (schema !== EXPECTED_SCHEMA || name !== EXPECTED_NAME) {
        DomHelpers.setStatus(statusEl, `This view is optimized for ${EXPECTED_SCHEMA}/${EXPECTED_NAME}.`, 'info');
    }

    const C = SHARED_CONSTANTS;

    if (startDateParam) {
        const normalized = normalizeDateTimeInput(startDateParam);
        startDateInput.value = (normalized && isValidDateRange(normalized)) ? normalized : C.DEFAULT_START_DATE;
    } else {
        startDateInput.value = C.DEFAULT_START_DATE;
    }

    if (endDateParam) {
        const normalized = normalizeDateTimeInput(endDateParam);
        endDateInput.value = (normalized && isValidDateRange(normalized)) ? normalized : C.DEFAULT_END_DATE;
    } else {
        endDateInput.value = C.DEFAULT_END_DATE;
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
            const availabilityStats = availabilityStyling.computeStats(availability?.geometries);
            MapManager.renderGeometries(map, availabilityLayer, availability?.geometries, {
                tooltipFactory: createAvailabilityTooltip,
                pointStyleFactory: (feature) => {
                    const baseStyle = availabilityStyling.getPointStyle(feature, availabilityStats);
                    return {
                        ...baseStyle,
                        radius: baseStyle.radius + 1.5,
                        color: '#0f172a',
                        weight: 2.4,
                        fillOpacity: 0.96,
                        opacity: 1
                    };
                },
                popupTrigger: 'hover',
                tooltipOptions: {
                    sticky: true,
                    direction: 'top',
                    opacity: 0.95,
                    className: 'ctd-trajectory-tooltip'
                }
            });
            availabilityStyling.updateLegend(availabilityStats);
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, availability?.periods);

            const periodCount = availability?.periods?.length || 0;
            const geometryCount = availability?.geometries?.features?.length || 0;
            DomHelpers.setStatus(statusEl, `Availability loaded: ${periodCount} periods, ${geometryCount} locations.`, 'success');
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

    function createAvailabilityTooltip(feature) {
        const observations = feature?.properties?.observations ?? '—';
        return `
            <div class="ctd-popup ctd-popup--trajectory">
                <div class="ctd-tooltip-row">
                    <span class="ctd-tooltip-key">Observations</span>
                    <span class="ctd-tooltip-value">${sanitize(String(formatValue(observations)))}</span>
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

        DomHelpers.setStatus(statusEl, 'Querying CTD data...', 'loading');
        destroyResultsMap();
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const wfsUrl = WfsClient.buildUrl(WFS_TYPE_NAME, {
                bbox: currentBoundingBox,
                startDate,
                endDate,
                procedures
            });
            const data = await WfsClient.fetchData(wfsUrl);

            if (!data || !Array.isArray(data.features) || data.features.length === 0) {
                destroyResultsMap();
                DomHelpers.renderEmptyState(resultsSection, 'No CTD data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${data.features.length} CTD records.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Error fetching CTD data:', error);
            destroyResultsMap();
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying CTD data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
        }
    });

    // ============================================
    // RESULTS RENDERING (CTD-specific)
    // ============================================
    let currentResultsFeatures = [];

    function renderResults(featureCollection) {
        destroyResultsMap();
        resultsSection.innerHTML = '';

        const allFeatures = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        currentResultsFeatures = allFeatures;
        const features = allFeatures.slice(0, MAX_RENDERED_ROWS);

        const resultsSummary = document.createElement('div');
        resultsSummary.className = 'results-summary';

        const summaryHeader = document.createElement('div');
        summaryHeader.className = 'results-summary__header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = 'Query results';

        const exportBtn = CsvExporter.createButton(() => {
            CsvExporter.exportFeatures(currentResultsFeatures, 'ctd-observations', {
                excludeFields: ['vertical_subsamples'],
                fieldOrder: ['procedure', 'result_time', 'feature_of_interest'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time: 'Date',
                    feature_of_interest: 'FeatureOfInterest'
                }
            });
        });
        summaryHeader.appendChild(titleEl);
        summaryHeader.appendChild(exportBtn);

        const subtitleEl = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(allFeatures.length);
        subtitleEl.append('Found ', countStrong, ' CTD observations.');

        resultsSummary.appendChild(summaryHeader);
        resultsSummary.appendChild(subtitleEl);

        if (allFeatures.length > MAX_RENDERED_ROWS) {
            const noteEl = document.createElement('p');
            noteEl.className = 'results-summary__note';
            noteEl.textContent = `Showing ${MAX_RENDERED_ROWS} rows to keep the interface responsive.`;
            resultsSummary.appendChild(noteEl);
        }

        if (allFeatures.length > MAX_RENDERED_MAP_FEATURES) {
            const mapNoteEl = document.createElement('p');
            mapNoteEl.className = 'results-summary__note';
            mapNoteEl.textContent = `The map displays the first ${MAX_RENDERED_MAP_FEATURES} geometries to keep performance smooth.`;
            resultsSummary.appendChild(mapNoteEl);
        }

        resultsSection.appendChild(resultsSummary);

        const resultsMapPanel = document.createElement('section');
        resultsMapPanel.className = 'results-map-panel';

        const resultsMapTitle = document.createElement('h3');
        resultsMapTitle.className = 'results-map-panel__title';
        resultsMapTitle.textContent = 'CTD result geometries';

        const resultsMapContainer = document.createElement('div');
        resultsMapContainer.className = 'results-map-panel__container';
        const mapContainerId = `results-map-${resultsMapIdCounter++}`;
        resultsMapContainer.id = mapContainerId;

        resultsMapPanel.appendChild(resultsMapTitle);
        resultsMapPanel.appendChild(resultsMapContainer);
        resultsSection.appendChild(resultsMapPanel);

        renderResultsMap(mapContainerId, featureCollection);

        const list = document.createElement('div');
        list.className = 'ctd-feature-list ctd-feature-list--grid';

        const createRow = (cells, isHeader = false) => {
            const row = document.createElement('div');
            row.className = `ctd-grid-row${isHeader ? ' ctd-grid-row--header' : ''}`;
            cells.forEach((content, index) => {
                const cell = document.createElement('span');
                const baseClass = isHeader ? 'ctd-grid-row__cell ctd-grid-row__cell--header' : 'ctd-grid-row__cell';
                const actionClass = index === cells.length - 1 ? ' ctd-grid-row__cell--actions' : '';
                cell.className = `${baseClass}${actionClass}`.trim();

                if (content instanceof HTMLElement) {
                    cell.appendChild(content);
                } else {
                    cell.textContent = content;
                }
                row.appendChild(cell);
            });
            return row;
        };

        list.appendChild(createRow(['Process', 'Date', 'Feature of Interest', 'View chart'], true));

        features.forEach((feature, index) => {
            const procedure = formatValue(feature?.properties?.procedure);
            const resultTime = formatDateTime(feature?.properties?.result_time);
            const foi = formatValue(feature?.properties?.feature_of_interest);

            const graphButton = document.createElement('button');
            graphButton.type = 'button';
            graphButton.className = 'ctd-grid-row__action';
            graphButton.textContent = 'View chart';
            graphButton.addEventListener('click', () => {
                const raw = feature?.properties?.vertical_subsamples;
                if (!raw) {
                    Logger.warn(`Observation ${index + 1}: vertical_subsamples unavailable`, feature);
                    notifications.warning('No vertical profile data is available for this observation.');
                    return;
                }

                try {
                    const metadata = {
                        procedure: feature?.properties?.procedure,
                        date: formatDateTime(feature?.properties?.result_time),
                        foi: feature?.properties?.feature_of_interest
                    };
                    openChartModal(raw, metadata);
                } catch (parseError) {
                    Logger.error('Error opening chart:', parseError);
                    notifications.error('Error loading the chart. Please try again.');
                }
            });

            list.appendChild(createRow([procedure, resultTime, foi, graphButton]));
        });

        resultsSection.appendChild(list);
    }

    function createResultMetadataTooltip(context = null) {
        const codigo = context?.codigo ? String(context.codigo) : '—';
        const nombre = context?.nombre ? String(context.nombre) : '—';
        const altura = context?.height ? String(context.height) : '—';
        return `
            <div class="ctd-popup ctd-popup--trajectory">
                <div class="ctd-tooltip-row">
                    <span class="ctd-tooltip-key">Code</span>
                    <span class="ctd-tooltip-value">${sanitize(codigo)}</span>
                </div>
                <div class="ctd-tooltip-row">
                    <span class="ctd-tooltip-key">Name</span>
                    <span class="ctd-tooltip-value">${sanitize(nombre)}</span>
                </div>
                <div class="ctd-tooltip-row">
                    <span class="ctd-tooltip-key">Height</span>
                    <span class="ctd-tooltip-value">${sanitize(altura)}</span>
                </div>
            </div>
        `;
    }

    function extractFeatureOfInterestId(feature) {
        const raw = feature?.properties?.feature_of_interest ?? feature?.properties?.featureOfInterest;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    }

    async function fetchFeatureOfInterestContext(featureId) {
        if (!featureId) return null;
        if (featureContextCache.has(featureId)) {
            return featureContextCache.get(featureId);
        }
        if (featureContextPending.has(featureId)) {
            return featureContextPending.get(featureId);
        }

        const schemaValue = form?.dataset?.schema || schema || EXPECTED_SCHEMA;
        const pendingRequest = ApiService.fetchFeatureOfInterest(
            schemaValue,
            FEATURE_OF_INTEREST_NAME,
            String(featureId)
        )
            .then((payload) => {
                const item = Array.isArray(payload) ? payload[0] : payload;
                const normalized = item && typeof item === 'object'
                    ? {
                        codigo: item.codigo,
                        nombre: item.nombre,
                        height: item.height
                    }
                    : null;
                featureContextCache.set(featureId, normalized);
                return normalized;
            })
            .catch((error) => {
                Logger.warn(`Could not load context for feature_of_interest=${featureId}:`, error);
                featureContextCache.set(featureId, null);
                return null;
            })
            .finally(() => {
                featureContextPending.delete(featureId);
            });

        featureContextPending.set(featureId, pendingRequest);
        return pendingRequest;
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
                const featureId = extractFeatureOfInterestId(feature);
                if (layer.bindTooltip) {
                    layer.bindTooltip(createResultMetadataTooltip(), {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'ctd-trajectory-tooltip'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.setStyle) {
                        layer.setStyle(hoverStyle);
                    }
                    if (layer.openTooltip) {
                        layer.openTooltip();
                    }
                    if (layer.bringToFront) {
                        layer.bringToFront();
                    }

                    if (featureId) {
                        void fetchFeatureOfInterestContext(featureId).then((context) => {
                            if (layer.setTooltipContent) {
                                layer.setTooltipContent(createResultMetadataTooltip(context));
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
                    if (layer.closeTooltip) {
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
    if (selectAllVarsBtn) {
        selectAllVarsBtn.addEventListener('click', () => {
            ChartHelpers.toggleAll('#variable-checkboxes', true, updateChart);
        });
    }
    if (deselectAllVarsBtn) {
        deselectAllVarsBtn.addEventListener('click', () => {
            ChartHelpers.toggleAll('#variable-checkboxes', false, updateChart);
        });
    }
    if (downloadChartBtn) {
        downloadChartBtn.addEventListener('click', () => {
            ChartHelpers.downloadChart(currentChart, 'perfil-vertical-ctd');
        });
    }

    ModalManager.setupDismissHandlers(chartModal, closeChartModal);

    function openChartModal(verticalSubsamples, metadata = {}) {
        if (!chartModal || !verticalSubsamples) {
            Logger.error('Chart modal or data not available');
            return;
        }

        try {
            const data = typeof verticalSubsamples === 'string'
                ? JSON.parse(verticalSubsamples)
                : verticalSubsamples;

            currentChartData = data;

            const modalTitle = document.getElementById('chart-modal-title');
            if (modalTitle) modalTitle.textContent = 'CTD vertical profile';

            if (chartMetadata && metadata) {
                const procedure = metadata.procedure || '—';
                const date = metadata.date || '—';
                const foi = metadata.foi || '—';
                chartMetadata.innerHTML = `
                    <span><strong>Process:</strong> ${sanitize(String(procedure))}</span>
                    <span><strong>Date:</strong> ${sanitize(String(date))}</span>
                    <span><strong>Location:</strong> ${sanitize(String(foi))}</span>
                `;
            }

            ChartHelpers.buildVariableCheckboxes(
                variableCheckboxesContainer, data.measures, VARIABLE_CONFIG, DEFAULT_SELECTED, updateChart
            );
            renderChart(data);
            ModalManager.open(chartModal);
        } catch (error) {
            Logger.error('Error opening chart modal:', error);
            notifications.error('Error loading chart data. Please try again.');
        }
    }

    function renderChart(data) {
        if (!chartCanvas || !data) return;

        const depths = data.sampling_height?.values || [];
        if (depths.length === 0) {
            Logger.warn('No depth data available');
            return;
        }

        if (currentChart) currentChart.destroy();

        const selectedVars = ChartHelpers.getSelectedValues('#variable-checkboxes');
        const datasets = [];

        selectedVars.forEach(varName => {
            const values = data.measures[varName];
            if (!values || !Array.isArray(values)) return;
            const config = VARIABLE_CONFIG[varName];
            if (!config) return;

            datasets.push({
                label: config.label,
                data: values.map((value, index) => ({ x: value, y: depths[index] })),
                borderColor: config.color,
                backgroundColor: config.color + '20',
                borderWidth: config.borderWidth,
                pointRadius: 1.5,
                pointHoverRadius: 4,
                pointBackgroundColor: config.color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                fill: false,
                tension: 0.1,
                spanGaps: true
            });
        });

        ChartHelpers.enhanceLineDatasets(datasets);

        const tooltipConfig = ChartHelpers.getTooltipConfig();
        tooltipConfig.callbacks = {
            title: (context) => {
                const depth = context[0]?.parsed?.y;
                return `Depth: ${depth?.toFixed(2)} m`;
            },
            label: (context) => {
                const value = context.parsed.x;
                return `${context.dataset.label}: ${value?.toFixed(4)}`;
            }
        };

        currentChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', axis: 'y', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: 'Vertical profile of oceanographic parameters',
                        font: { size: 16, weight: 'bold', family: C.CHART_FONT_FAMILY },
                        padding: 20,
                        color: C.CHART_TITLE_COLOR
                    },
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            boxWidth: 12, boxHeight: 12, padding: 12,
                            font: { size: 11, family: C.CHART_FONT_FAMILY },
                            color: C.CHART_TITLE_COLOR, usePointStyle: true
                        }
                    },
                    tooltip: tooltipConfig
                },
                scales: {
                    x: { ...ChartHelpers.getAxisConfig({ titleText: 'Parameter value', position: 'top' }) },
                    y: { ...ChartHelpers.getAxisConfig({ titleText: 'Depth (m)', reverse: true }) }
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
                if (variableCheckboxesContainer) variableCheckboxesContainer.innerHTML = '';
                if (chartMetadata) chartMetadata.innerHTML = '';
            }
        });
    }
});

