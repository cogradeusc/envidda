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
    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('temporal-series-chart');
    const variableCheckboxesContainer = document.getElementById('variable-checkboxes');
    const selectAllVarsBtn = document.getElementById('select-all-vars');
    const deselectAllVarsBtn = document.getElementById('deselect-all-vars');
    const downloadChartBtn = document.getElementById('download-chart');
    const chartMetadata = document.getElementById('chart-metadata');

    // ============================================
    // STATE
    // ============================================
    let currentBoundingBox = null;
    let availabilityController = null;
    let availabilityFetchTimeout = null;
    let currentChart = null;
    let currentChartData = null;
    let resultsMap = null;
    let resultsMapLayer = null;
    let resultsMapIdCounter = 0;
    let resultsMapInitialBounds = null;
    let resultsMapInitialCenter = null;
    let resultsMapInitialZoom = null;

    // ============================================
    // VESSEL-SPECIFIC CONFIGURATION
    // ============================================
    const EXPECTED_SCHEMA = 'vessel_sampling_ieo';
    const EXPECTED_NAME = 'vessel';
    const WFS_TYPE_NAME = 'ccmm:observation_vessel_wfs';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 1500;

    const VARIABLE_CONFIG = {
        temperatura_090c: { label: 'Temperature 090c (°C)', color: '#ef4444', borderWidth: 2 },
        salinidad: { label: 'Salinity (PSU)', color: '#3b82f6', borderWidth: 2 },
        temperatura: { label: 'Temperature (°C)', color: '#f97316', borderWidth: 2 },
        presion: { label: 'Pressure (dbar)', color: '#8b5cf6', borderWidth: 2 },
        ph: { label: 'pH', color: '#10b981', borderWidth: 2 },
        oxigeno: { label: 'Oxygen (mg/L)', color: '#f59e0b', borderWidth: 2 },
        conductividad: { label: 'Conductivity (S/m)', color: '#0891b2', borderWidth: 2 },
        densidad: { label: 'Density (kg/m³)', color: '#14b8a6', borderWidth: 2 },
        fluorescencia: { label: 'Fluorescence', color: '#a855f7', borderWidth: 2 },
        turbidez: { label: 'Turbidity (NTU)', color: '#84cc16', borderWidth: 2 },
        clorofila: { label: 'Chlorophyll (μg/L)', color: '#22c55e', borderWidth: 2 }
    };

    const DEFAULT_SELECTED = ['temperatura_090c'];

    // ============================================
    // URL PARAMETERS & INITIALIZATION
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema');
    const nameParam = urlParams.get('name');
    const proceduresParam = urlParams.get('procedure');
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    const schema = (schemaParam || EXPECTED_SCHEMA).trim() || EXPECTED_SCHEMA;
    const name = (nameParam || EXPECTED_NAME).trim() || EXPECTED_NAME;

    form.dataset.schema = schema;
    form.dataset.name = name;

    if (backLink) {
        backLink.href = `process-type.html?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
    }

    if (pageTitle) {
        pageTitle.textContent = 'Vessel observations';
    }
    document.title = 'Lendas - Vessel data query';

    if (schema !== EXPECTED_SCHEMA || name !== EXPECTED_NAME) {
        DomHelpers.setStatus(statusEl, `This view is optimized for ${EXPECTED_SCHEMA}/${EXPECTED_NAME}.`, 'info');
    }

    if (proceduresParam) proceduresInput.value = proceduresParam;
    if (startDateParam) {
        const normalized = normalizeDateTimeInput(startDateParam);
        if (normalized) startDateInput.value = normalized;
    }
    if (endDateParam) {
        const normalized = normalizeDateTimeInput(endDateParam);
        if (normalized) endDateInput.value = normalized;
    }

    const C = SHARED_CONSTANTS;

    if (!startDateInput.value) {
        startDateInput.value = C.DEFAULT_START_DATE;
    }
    if (!endDateInput.value) {
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

        if (!schema || !name || !startDate || !endDate) {
            return;
        }

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
                    schema, name, procedures,
                    startTime: formatDateTimeForRequest(startDate),
                    endTime: formatDateTimeForRequest(endDate),
                    bbox: currentBoundingBox
                },
                availabilityController.signal
            );
            const availabilityStats = availabilityStyling.computeStats(availability?.geometries);
            MapManager.renderGeometries(map, availabilityLayer, availability?.geometries, {
                styleFactory: (feature) => availabilityStyling.getFeatureStyle(feature, availabilityStats),
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
                tooltipFactory: (feature) => {
                    const observations = feature?.properties?.observations ?? '—';
                    return `
                        <div class="vessel-popup vessel-popup--trajectory">
                            <div class="vessel-tooltip-row">
                                <span class="vessel-tooltip-key">Observations</span>
                                <span class="vessel-tooltip-value">${sanitize(String(observations))}</span>
                            </div>
                        </div>
                    `;
                },
                tooltipOptions: {
                    sticky: true,
                    direction: 'top',
                    opacity: 0.95,
                    className: 'vessel-trajectory-tooltip'
                },
                popupTrigger: 'hover'
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

    scheduleAvailabilityRefresh(true);

    // ============================================
    // FORM SUBMISSION & WFS QUERY
    // ============================================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const procedures = (formData.get('procedures') || '').toString().trim();
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

        DomHelpers.setStatus(statusEl, 'Querying vessel data...', 'loading');
        destroyResultsMap();
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            // Vessel uses different date fields (result_time_start/end range query)
            const isoStart = toIsoString(startDate);
            const isoEnd = toIsoString(endDate);
            const extraClauses = [];
            if (isoStart && isoEnd) {
                extraClauses.push(`result_time_start<='${isoEnd}'`);
                extraClauses.push(`result_time_end>='${isoStart}'`);
            } else if (isoStart) {
                extraClauses.push(`result_time_end>='${isoStart}'`);
            } else if (isoEnd) {
                extraClauses.push(`result_time_start<='${isoEnd}'`);
            }

            const wfsUrl = WfsClient.buildUrl(WFS_TYPE_NAME, {
                bbox: currentBoundingBox,
                procedures,
                extraClauses
            });
            const data = await WfsClient.fetchData(wfsUrl);

            if (!data || !Array.isArray(data.features) || data.features.length === 0) {
                destroyResultsMap();
                DomHelpers.renderEmptyState(resultsSection, 'No vessel data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${data.features.length} vessel observations.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Error fetching Vessel WFS data:', error);
            destroyResultsMap();
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying vessel data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
        }
    });

    // ============================================
    // RESULTS RENDERING (Vessel-specific)
    // ============================================
    function renderResults(featureCollection) {
        resultsSection.innerHTML = '';

        const allFeatures = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        const features = allFeatures.slice(0, MAX_RENDERED_ROWS);

        const resultsSummary = document.createElement('div');
        resultsSummary.className = 'results-summary';

        const summaryHeader = document.createElement('div');
        summaryHeader.className = 'results-summary__header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = 'Query results';

        const exportBtn = CsvExporter.createButton(() => {
            CsvExporter.exportFeatures(allFeatures, 'vessel-observations', {
                fieldOrder: ['procedure', 'result_time_start', 'result_time_end', 'sampled_feature'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time_start: 'Start date',
                    result_time_end: 'End date',
                    sampled_feature: 'FeatureOfInterest'
                }
            });
        });

        summaryHeader.appendChild(titleEl);
        summaryHeader.appendChild(exportBtn);

        const subtitleEl = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(allFeatures.length);
        subtitleEl.append('Found ', countStrong, ' vessel observations.');

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
            mapNoteEl.textContent = `The map displays the first ${MAX_RENDERED_MAP_FEATURES} tracks to keep performance smooth.`;
            resultsSummary.appendChild(mapNoteEl);
        }

        resultsSection.appendChild(resultsSummary);

        if (features.length === 0) return;

        const resultsMapPanel = document.createElement('section');
        resultsMapPanel.className = 'results-map-panel';

        const resultsMapTitle = document.createElement('h3');
        resultsMapTitle.className = 'results-map-panel__title';
        resultsMapTitle.textContent = 'Vessel tracks';

        const resultsMapContainer = document.createElement('div');
        resultsMapContainer.className = 'results-map-panel__container';
        const mapContainerId = `results-map-${resultsMapIdCounter++}`;
        resultsMapContainer.id = mapContainerId;

        resultsMapPanel.appendChild(resultsMapTitle);
        resultsMapPanel.appendChild(resultsMapContainer);
        resultsSection.appendChild(resultsMapPanel);

        renderResultsMap(mapContainerId, featureCollection);

        const list = document.createElement('div');
        list.className = 'vessel-feature-list';

        const createRow = (cells, isHeader = false) => {
            const row = document.createElement('div');
            row.className = `vessel-grid-row${isHeader ? ' vessel-grid-row--header' : ''}`;

            cells.forEach((content, index) => {
                const cell = document.createElement('span');
                const classes = ['vessel-grid-row__cell'];
                if (isHeader) classes.push('vessel-grid-row__cell--header');
                if (!isHeader && index === cells.length - 1) classes.push('vessel-grid-row__cell--actions');
                cell.className = classes.join(' ');

                if (typeof content === 'string') {
                    cell.textContent = content;
                } else if (content instanceof HTMLElement) {
                    cell.appendChild(content);
                } else {
                    cell.textContent = '';
                }
                row.appendChild(cell);
            });
            return row;
        };

        list.appendChild(createRow(['Process', 'Start date', 'End date', 'Samples', 'View chart'], true));

        features.forEach((feature) => {
            const props = feature?.properties || {};
            const procedure = props.procedure ?? '—';
            const startTime = formatDateTime(props.result_time_start ?? props.resultTimeStart ?? '');
            const endTime = formatDateTime(props.result_time_end ?? props.resultTimeEnd ?? '');
            const pointCount = getGeometryPointCount(feature?.geometry);

            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'vessel-grid-row__action';
            actionButton.textContent = 'View chart';
            actionButton.addEventListener('click', () => {
                const raw = props.temporal_subsamples ?? props.temporalSubsamples;
                if (!raw) {
                    Logger.warn(`Observation ${feature.id}: temporal_subsamples unavailable`, feature);
                    notifications.warning('No time-series data is available for this observation.');
                    return;
                }

                try {
                    const metadata = {
                        procedure: props.procedure,
                        startTime: formatDateTime(props.result_time_start ?? props.resultTimeStart ?? ''),
                        endTime: formatDateTime(props.result_time_end ?? props.resultTimeEnd ?? ''),
                        foi: props.sampled_feature ?? props.sampledFeature ?? props.feature_of_interest ?? ''
                    };
                    openChartModal(raw, metadata);
                } catch (parseError) {
                    Logger.error('Error opening chart:', parseError);
                    notifications.error('Error loading the chart. Please try again.');
                }
            });

            list.appendChild(createRow([String(procedure), startTime, endTime, String(pointCount), actionButton]));
        });

        resultsSection.appendChild(list);
    }

    function createResultMetadataTooltip(feature) {
        const props = feature?.properties || {};
        const procedure = props.procedure ?? '—';
        const startTime = formatDateTime(props.result_time_start ?? props.resultTimeStart ?? '');
        const endTime = formatDateTime(props.result_time_end ?? props.resultTimeEnd ?? '');
        const pointCount = getGeometryPointCount(feature?.geometry);

        return `
            <div class="vessel-popup vessel-popup--trajectory">
                <div class="vessel-tooltip-row">
                    <span class="vessel-tooltip-key">Process</span>
                    <span class="vessel-tooltip-value">${sanitize(String(procedure))}</span>
                </div>
                <div class="vessel-tooltip-row">
                    <span class="vessel-tooltip-key">Start date</span>
                    <span class="vessel-tooltip-value">${sanitize(String(startTime))}</span>
                </div>
                <div class="vessel-tooltip-row">
                    <span class="vessel-tooltip-key">End date</span>
                    <span class="vessel-tooltip-value">${sanitize(String(endTime))}</span>
                </div>
                <div class="vessel-tooltip-row">
                    <span class="vessel-tooltip-key">Samples</span>
                    <span class="vessel-tooltip-value">${sanitize(String(pointCount))}</span>
                </div>
            </div>
        `;
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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
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
            onEachFeature: (feature, layer) => {
                if (layer.bindTooltip) {
                    layer.bindTooltip(createResultMetadataTooltip(feature), {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'vessel-trajectory-tooltip'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.setStyle) layer.setStyle(hoverStyle);
                    if (layer.openTooltip) layer.openTooltip();
                    if (layer.bringToFront) layer.bringToFront();
                });

                layer.on('mouseout', () => {
                    if (resultsMapLayer?.resetStyle) resultsMapLayer.resetStyle(layer);
                    if (layer.closeTooltip) layer.closeTooltip();
                });
            }
        }).addTo(resultsMap);

        const bounds = resultsMapLayer.getBounds();
        if (bounds?.isValid()) {
            resultsMapInitialBounds = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
            resultsMap.fitBounds(bounds, { padding: [24, 24] });
        } else {
            resultsMapInitialCenter = [42.8864, -8.5212];
            resultsMapInitialZoom = 7;
            resultsMap.setView([42.8864, -8.5212], 7);
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
                    center: resultsMapInitialCenter || [42.8864, -8.5212],
                    zoom: Number.isFinite(resultsMapInitialZoom) ? resultsMapInitialZoom : 7
                };
            }
        });

        window.setTimeout(() => {
            if (resultsMap) resultsMap.invalidateSize();
        }, 0);
    }

    function getGeometryPointCount(geometry) {
        if (!geometry || !geometry.type) return '—';

        if (geometry.type === 'LineString') {
            return Array.isArray(geometry.coordinates) ? geometry.coordinates.length : '—';
        }

        if (geometry.type === 'MultiLineString') {
            if (!Array.isArray(geometry.coordinates)) return '—';
            return geometry.coordinates.reduce((sum, line) => sum + (Array.isArray(line) ? line.length : 0), 0);
        }

        return '—';
    }

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
            ChartHelpers.downloadChart(currentChart, 'vessel-time-series');
        });
    }

    ModalManager.setupDismissHandlers(chartModal, closeChartModal);

    function openChartModal(temporalSubsamples, metadata = {}) {
        if (!chartModal || !temporalSubsamples) {
            Logger.error('Chart modal or data not available');
            return;
        }

        try {
            const data = typeof temporalSubsamples === 'string'
                ? JSON.parse(temporalSubsamples)
                : temporalSubsamples;

            currentChartData = data;

            const modalTitle = document.getElementById('chart-modal-title');
            if (modalTitle) modalTitle.textContent = 'Vessel time series';

            if (chartMetadata && metadata) {
                const procedure = metadata.procedure || '—';
                const startTime = metadata.startTime || '—';
                const endTime = metadata.endTime || '—';
                const foi = metadata.foi || '—';
                chartMetadata.innerHTML = `
                    <span><strong>Process:</strong> ${sanitize(String(procedure))}</span>
                    <span><strong>From:</strong> ${sanitize(String(startTime))}</span>
                    <span><strong>To:</strong> ${sanitize(String(endTime))}</span>
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

        const timestamps = data.sampling_time || [];
        if (timestamps.length === 0) {
            Logger.warn('No timestamp data available');
            return;
        }

        if (currentChart) currentChart.destroy();

        const selectedVars = ChartHelpers.getSelectedValues('#variable-checkboxes');
        const datasets = [];

        selectedVars.forEach(varName => {
            const values = data.measures[varName];
            if (!values || !Array.isArray(values)) return;

            const config = VARIABLE_CONFIG[varName] || {
                label: varName,
                color: C.PROCESS_COLORS[Math.abs(varName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % C.PROCESS_COLORS.length],
                borderWidth: 2
            };

            datasets.push({
                label: config.label,
                data: timestamps.map((timestamp, index) => ({ x: timestamp, y: values[index] })),
                borderColor: config.color,
                backgroundColor: config.color + '20',
                borderWidth: config.borderWidth,
                pointRadius: 1,
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
                const timestamp = context[0]?.parsed?.x;
                if (timestamp) {
                return new Date(timestamp).toLocaleString('en-US', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                }
                return '';
            },
            label: (context) => `${context.dataset.label}: ${context.parsed.y?.toFixed(4)}`
        };

        const xAxis = ChartHelpers.getAxisConfig({ titleText: 'Time', type: 'time' });
        xAxis.time = {
            displayFormats: { hour: 'HH:mm', minute: 'HH:mm', second: 'HH:mm:ss' },
            tooltipFormat: 'Pp'
        };
        xAxis.ticks = { ...xAxis.ticks, maxRotation: 45, minRotation: 0 };

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
                        text: 'Time series of oceanographic parameters',
                        font: { size: 16, weight: 'bold', family: C.CHART_FONT_FAMILY },
                        padding: 20,
                        color: C.CHART_TITLE_COLOR
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
                if (variableCheckboxesContainer) variableCheckboxesContainer.innerHTML = '';
                if (chartMetadata) chartMetadata.innerHTML = '';
            }
        });
    }
});

