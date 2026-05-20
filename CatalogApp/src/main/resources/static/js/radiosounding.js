'use strict';

document.addEventListener('DOMContentLoaded', () => {
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
    const pageTitle = document.getElementById('page-title');
    const backLink = document.getElementById('back-link');

    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('radiosounding-chart');
    const variableCheckboxesContainer = document.getElementById('variable-checkboxes');
    const selectAllVarsBtn = document.getElementById('select-all-vars');
    const deselectAllVarsBtn = document.getElementById('deselect-all-vars');
    const downloadChartBtn = document.getElementById('download-chart');
    const chartMetadata = document.getElementById('chart-metadata');

    if (!form || !startDateInput || !endDateInput || !proceduresInput || !statusEl || !availabilitySection || !resultsSection ||
        !searchButton || !clearBboxButton || !bboxDisplay || !chartModal || !chartCanvas ||
        !variableCheckboxesContainer || !selectAllVarsBtn || !deselectAllVarsBtn || !downloadChartBtn || !chartMetadata) {
        Logger.error('Radiosounding: required DOM elements are missing.');
        return;
    }

    const C = SHARED_CONSTANTS;
    const EXPECTED_SCHEMA = 'radiosounding';
    const EXPECTED_NAME = 'radiosounding_process';
    const WFS_LAYER = 'ccmm:observation_radiosounding_process_wfs';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 1500;
    const MAX_CHART_POINTS_PER_SERIES = 4000;

    const DEFAULT_SELECTED_VARIABLES = [
        'temperature',
        'dew_point_temperature',
        'humidity'
    ];

    const VARIABLE_LABELS = {
        sampling_height: 'Sampling height (m)',
        pressure: 'Pressure (hPa)',
        temperature: 'Temperature (C)',
        dew_point_temperature: 'Dew point (C)',
        humidity: 'Relative humidity (%)',
        wind_direction: 'Wind direction (deg)',
        wind_speed: 'Wind speed',
        tiempo: 'Time (min)',
        observations: 'Observations per instant'
    };

    const COLOR_PALETTE = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
        '#ec4899', '#64748b'
    ];

    const NON_NUMERIC_MEASURES = new Set([
        'sampling_geometry',
        'sampling_time',
        'sampling_height',
        'samplingHeight'
    ]);

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

    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = (urlParams.get('schema') || EXPECTED_SCHEMA).trim() || EXPECTED_SCHEMA;
    const nameParam = (urlParams.get('name') || EXPECTED_NAME).trim() || EXPECTED_NAME;
    const procedureParam = (urlParams.get('procedure') || '').trim();
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    form.dataset.schema = schemaParam;
    form.dataset.name = nameParam;

    if (pageTitle) {
        pageTitle.textContent = 'Radiosounding observations';
    }

    if (backLink) {
        backLink.href = `process-type.html?schema=${encodeURIComponent(schemaParam)}&name=${encodeURIComponent(nameParam)}`;
    }

    document.title = 'Lendas - Radiosounding data query';

    if (schemaParam !== EXPECTED_SCHEMA || nameParam !== EXPECTED_NAME) {
        DomHelpers.setStatus(
            statusEl,
            `This view is optimized for ${EXPECTED_SCHEMA}/${EXPECTED_NAME}.`,
            'info'
        );
    }

    if (procedureParam) {
        proceduresInput.value = procedureParam;
    }

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

    const { map, drawnItems, availabilityLayer } = MapManager.initializeMap('map');
    const searchResultsLayer = L.layerGroup().addTo(map);

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

    selectAllVarsBtn.addEventListener('click', () => {
        ChartHelpers.toggleAll('#variable-checkboxes', true, updateChart);
    });

    deselectAllVarsBtn.addEventListener('click', () => {
        ChartHelpers.toggleAll('#variable-checkboxes', false, updateChart);
    });

    downloadChartBtn.addEventListener('click', () => {
        ChartHelpers.downloadChart(currentChart, 'radiosounding-time-series');
    });

    ModalManager.setupDismissHandlers(chartModal, closeChartModal);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const procedures = (formData.get('procedures') || '').toString().trim();
        const startDate = (formData.get('start-date') || '').toString();
        const endDate = (formData.get('end-date') || '').toString();

        if (!startDate || !endDate) {
            DomHelpers.setStatus(statusEl, 'Select a start and end date.', 'error');
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

        DomHelpers.setStatus(statusEl, 'Querying radiosounding data...', 'loading');
        destroyResultsMap();
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const extraClauses = buildTimeRangeClauses(startDate, endDate);
            const wfsUrl = WfsClient.buildUrl(WFS_LAYER, {
                bbox: currentBoundingBox,
                procedures,
                extraClauses
            });

            const data = await WfsClient.fetchData(wfsUrl);
            const features = Array.isArray(data?.features) ? data.features : [];

            if (features.length === 0) {
                searchResultsLayer.clearLayers();
                destroyResultsMap();
                DomHelpers.renderEmptyState(resultsSection, 'No radiosounding data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            searchResultsLayer.clearLayers();
            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${features.length} radiosounding observations.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Radiosounding: error querying WFS:', error);
            destroyResultsMap();
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying radiosounding data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
        }
    });

    scheduleAvailabilityRefresh(true);

    function scheduleAvailabilityRefresh(force = false) {
        if (availabilityFetchTimeout) {
            clearTimeout(availabilityFetchTimeout);
        }

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
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
            DomHelpers.setStatus(statusEl, 'For availability, enter processes or draw a BBOX.', 'info');
            return;
        }

        if (availabilityController) {
            availabilityController.abort();
        }
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

            renderAvailabilityGeometries(availability?.geometries);
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, availability?.periods);

            const periodCount = availability?.periods?.length || 0;
            const geometryCount = availability?.geometries?.features?.length || 0;
            DomHelpers.setStatus(statusEl, `Availability loaded: ${periodCount} periods, ${geometryCount} locations.`, 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            Logger.error('Radiosounding: error fetching availability:', error);
            availabilityLayer.clearLayers();
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
            DomHelpers.setStatus(statusEl, 'Availability could not be retrieved.', 'error');
        } finally {
            availabilityController = null;
        }
    }

    function renderAvailabilityGeometries(geometries) {
        availabilityLayer.clearLayers();

        if (!geometries || !Array.isArray(geometries.features) || geometries.features.length === 0) {
            return;
        }

        const baseStyle = {
            color: '#1d4ed8',
            weight: 2.4,
            fillColor: '#2563eb',
            fillOpacity: 0.22,
            opacity: 1
        };

        const hoverStyle = {
            color: '#172554',
            weight: 3.2,
            fillColor: '#1d4ed8',
            fillOpacity: 0.28,
            opacity: 1
        };

        const availabilityGeoJson = L.geoJSON(geometries, {
            style: () => baseStyle,
            pointToLayer: (feature, latlng) => {
                const count = feature?.properties?.observations;
                return L.circleMarker(latlng, {
                    radius: SHARED_CONSTANTS.MARKER_BASE_RADIUS + Math.min(Number(count) || 0, 20) * 0.3 + 1.5,
                    fillColor: '#2563eb',
                    color: '#0f172a',
                    weight: 2.4,
                    fillOpacity: 0.96,
                    opacity: 1
                });
            },
            onEachFeature: (feature, layer) => {
                const observations = feature?.properties?.observations ?? '—';
                const tooltipContent = `
                    <div class="radiosounding-popup radiosounding-popup--trajectory">
                        <div class="radiosounding-tooltip-row">
                            <span class="radiosounding-tooltip-key">Observations</span>
                            <span class="radiosounding-tooltip-value">${sanitize(String(observations))}</span>
                        </div>
                    </div>
                `;

                if (layer.bindTooltip) {
                    layer.bindTooltip(tooltipContent, {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'radiosounding-trajectory-tooltip'
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
                });

                layer.on('mouseout', () => {
                    if (availabilityGeoJson.resetStyle && layer.setStyle) {
                        availabilityGeoJson.resetStyle(layer);
                    }
                    if (layer.closeTooltip) {
                        layer.closeTooltip();
                    }
                });
            }
        });

        availabilityGeoJson.addTo(availabilityLayer);

        if (availabilityGeoJson.getBounds().isValid()) {
            map.fitBounds(availabilityGeoJson.getBounds(), { padding: [30, 30] });
        }
    }

    function createResultMetadataTooltip(feature) {
        const props = feature?.properties || {};

        const startTime = formatDateTime(props.result_time_start ?? props.resultTimeStart ?? '');
        const endTime = formatDateTime(props.result_time_end ?? props.resultTimeEnd ?? '');
        const pointCount = getGeometryPointCount(feature?.geometry);

        return `
            <div class="radiosounding-popup radiosounding-popup--trajectory">
                <div class="radiosounding-tooltip-row">
                    <span class="radiosounding-tooltip-key">Start date</span>
                    <span class="radiosounding-tooltip-value">${sanitize(String(startTime))}</span>
                </div>
                <div class="radiosounding-tooltip-row">
                    <span class="radiosounding-tooltip-key">End date</span>
                    <span class="radiosounding-tooltip-value">${sanitize(String(endTime))}</span>
                </div>
                <div class="radiosounding-tooltip-row">
                    <span class="radiosounding-tooltip-key">Samples</span>
                    <span class="radiosounding-tooltip-value">${sanitize(String(pointCount))}</span>
                </div>
            </div>
        `;
    }

    function renderResults(featureCollection) {
        resultsSection.innerHTML = '';

        const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        const renderedFeatures = features.slice(0, MAX_RENDERED_ROWS);

        const summary = document.createElement('div');
        summary.className = 'results-summary';

        const summaryHeader = document.createElement('div');
        summaryHeader.className = 'results-summary__header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = 'Query results';

        const exportBtn = CsvExporter.createButton(() => {
            CsvExporter.exportFeatures(features, 'radiosounding-observations', {
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
        countStrong.textContent = String(features.length);
        subtitleEl.append('Found ', countStrong, ' radiosounding observations.');

        summary.appendChild(summaryHeader);
        summary.appendChild(subtitleEl);

        if (features.length > MAX_RENDERED_ROWS) {
            const noteEl = document.createElement('p');
            noteEl.className = 'results-summary__note';
            noteEl.textContent = `Showing ${MAX_RENDERED_ROWS} rows to keep the interface responsive.`;
            summary.appendChild(noteEl);
        }

        if (features.length > MAX_RENDERED_MAP_FEATURES) {
            const mapNoteEl = document.createElement('p');
            mapNoteEl.className = 'results-summary__note';
            mapNoteEl.textContent = `The map displays the first ${MAX_RENDERED_MAP_FEATURES} geometries to keep performance smooth.`;
            summary.appendChild(mapNoteEl);
        }

        resultsSection.appendChild(summary);
        const resultsMapPanel = document.createElement('section');
        resultsMapPanel.className = 'results-map-panel';

        const resultsMapTitle = document.createElement('h3');
        resultsMapTitle.className = 'results-map-panel__title';
        resultsMapTitle.textContent = 'Radiosounding trajectories';

        const resultsMapContainer = document.createElement('div');
        resultsMapContainer.className = 'results-map-panel__container';
        const mapContainerId = `results-map-${resultsMapIdCounter++}`;
        resultsMapContainer.id = mapContainerId;

        resultsMapPanel.appendChild(resultsMapTitle);
        resultsMapPanel.appendChild(resultsMapContainer);
        resultsSection.appendChild(resultsMapPanel);

        renderResultsMap(mapContainerId, featureCollection);

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'radiosounding-results-table-wrapper';

        const table = document.createElement('table');
        table.className = 'radiosounding-results-table';

        const colgroup = document.createElement('colgroup');
        [
            'radiosounding-results-table__col--process',
            'radiosounding-results-table__col--start',
            'radiosounding-results-table__col--end',
            'radiosounding-results-table__col--points',
            'radiosounding-results-table__col--action'
        ].forEach((className) => {
            const col = document.createElement('col');
            col.className = className;
            colgroup.appendChild(col);
        });
        table.appendChild(colgroup);

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['PROCESS', 'START DATE', 'END DATE', 'SAMPLES', 'CHART'].forEach((label) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = label;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        renderedFeatures.forEach((feature) => {
            const props = feature?.properties || {};
            const procedure = formatValue(props.procedure);
            const startTime = formatDateTime(props.result_time_start ?? props.resultTimeStart ?? '');
            const endTime = formatDateTime(props.result_time_end ?? props.resultTimeEnd ?? '');
            const pointCount = getGeometryPointCount(feature?.geometry);

            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'radiosounding-grid-row__action';
            actionButton.textContent = 'View chart';

            const hasChartData = Boolean(props.temporal_subsamples ?? props.temporalSubsamples);
            if (!hasChartData) {
                actionButton.disabled = true;
                actionButton.title = 'This observation has no temporal subsamples';
            } else {
                actionButton.addEventListener('click', () => {
                    openChartModal(feature);
                });
            }

            const row = document.createElement('tr');

            [String(procedure), String(startTime), String(endTime), String(pointCount)].forEach((value) => {
                const td = document.createElement('td');
                td.textContent = value;
                row.appendChild(td);
            });

            const actionCell = document.createElement('td');
            actionCell.className = 'radiosounding-results-table__action-cell';
            actionCell.appendChild(actionButton);
            row.appendChild(actionCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        resultsSection.appendChild(tableWrapper);
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
        if (!container) {
            return;
        }

        const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        if (features.length === 0) {
            return;
        }
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
                        className: 'radiosounding-trajectory-tooltip'
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
            if (resultsMap) {
                resultsMap.invalidateSize();
            }
        }, 0);
    }

    function openChartModal(feature) {
        const props = feature?.properties || {};
        const rawTemporalSubsamples = props.temporal_subsamples ?? props.temporalSubsamples;

        if (!rawTemporalSubsamples) {
            notifications.warning('No radiosounding time data is available for this observation.');
            return;
        }

        let parsedData;
        try {
            parsedData = parseTemporalSubsamples(rawTemporalSubsamples);
        } catch (error) {
            Logger.error('Radiosounding: error parsing temporal_subsamples:', error);
            notifications.error('Could not parse the radiosounding time series.');
            return;
        }

        if (!parsedData || Object.keys(parsedData.seriesByVariable).length === 0) {
            notifications.warning('No numeric measurements were found to plot.');
            return;
        }

        currentChartData = parsedData;

        const modalTitle = document.getElementById('chart-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Radiosounding vertical profile';
        }

        const metadata = {
            procedure: formatValue(props.procedure),
            foi: formatValue(props.sampled_feature ?? props.sampledFeature ?? props.feature_of_interest ?? props.featureOfInterest),
            periodLabel: parsedData.periodLabel,
            heightRangeLabel: parsedData.heightRangeLabel,
            samples: parsedData.sampleCount,
            sampledLabel: parsedData.sampledLabel
        };

        chartMetadata.innerHTML = `
            <span><strong>Process:</strong> ${sanitize(String(metadata.procedure))}</span>
            <span><strong>Feature:</strong> ${sanitize(String(metadata.foi))}</span>
            <span><strong>Period:</strong> ${sanitize(String(metadata.periodLabel))}</span>
            <span><strong>Height:</strong> ${sanitize(String(metadata.heightRangeLabel || '—'))}</span>
            <span><strong>Samples:</strong> ${sanitize(String(metadata.samples))}</span>
            ${metadata.sampledLabel ? `<span><strong>Sampling:</strong> ${sanitize(String(metadata.sampledLabel))}</span>` : ''}
        `;

        ChartHelpers.buildVariableCheckboxes(
            variableCheckboxesContainer,
            parsedData.seriesByVariable,
            parsedData.variableConfig,
            parsedData.defaultSelected,
            updateChart
        );

        renderChart(parsedData);
        ModalManager.open(chartModal);
    }

    function parseTemporalSubsamples(rawTemporalSubsamples) {
        const parsed = typeof rawTemporalSubsamples === 'string'
            ? JSON.parse(rawTemporalSubsamples)
            : rawTemporalSubsamples;

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Temporal subsamples are empty or invalid.');
        }

        const measuresSource = (parsed.measures && typeof parsed.measures === 'object') ? parsed.measures : {};

        const rawTimes = normalizeArray(
            parsed.sampling_time ||
            parsed.samplingTime ||
            measuresSource.sampling_time ||
            measuresSource.samplingTime
        );
        const rawHeights = normalizeArray(
            parsed.sampling_height ||
            parsed.samplingHeight ||
            measuresSource.sampling_height ||
            measuresSource.samplingHeight
        );

        const normalizedTimes = rawTimes
            .map((value, index) => ({
                index,
                timestamp: normalizeTimestamp(value)
            }))
            .filter((entry) => Boolean(entry.timestamp));

        const normalizedHeights = rawHeights
            .map((value, index) => ({
                index,
                height: toFiniteNumber(value)
            }))
            .filter((entry) => entry.height !== null);

        const sampleCountFromSource = extractSampleCount(
            parsed.sampling_time,
            parsed.samplingTime,
            parsed.sampling_height,
            parsed.samplingHeight,
            measuresSource.sampling_time,
            measuresSource.samplingTime,
            measuresSource.sampling_height,
            measuresSource.samplingHeight
        );

        if (normalizedHeights.length === 0) {
            throw new Error('There are no valid sampling heights to plot.');
        }

        const seriesByVariable = {};
        const variableConfig = {};
        let wasSampled = false;
        let sampledLabel = '';

        Object.entries(measuresSource).forEach(([variableName, rawValues]) => {
            if (shouldExcludeMeasure(variableName)) {
                return;
            }

            const values = normalizeArray(rawValues);
            if (values.length === 0) {
                return;
            }

            const bucketsByHeight = new Map();

            normalizedHeights.forEach(({ index, height }) => {
                const numericValue = toFiniteNumber(values[index]);
                if (numericValue === null) {
                    return;
                }

                const bucket = bucketsByHeight.get(height) || { sum: 0, count: 0 };
                bucket.sum += numericValue;
                bucket.count += 1;
                bucketsByHeight.set(height, bucket);
            });

            if (bucketsByHeight.size === 0) {
                return;
            }

            const orderedPoints = Array.from(bucketsByHeight.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([height, bucket]) => ({
                    x: bucket.sum / bucket.count,
                    y: height
                }));

            const sampledPoints = downsamplePoints(orderedPoints, MAX_CHART_POINTS_PER_SERIES);
            if (sampledPoints.length < orderedPoints.length) {
                wasSampled = true;
                sampledLabel = `${sampledPoints.length} de ${orderedPoints.length} puntos por variable`;
            }

            seriesByVariable[variableName] = sampledPoints;
            variableConfig[variableName] = {
                label: VARIABLE_LABELS[variableName] || beautifyLabel(variableName),
                color: getColorForVariable(variableName),
                borderWidth: 2
            };
        });

        // Expose time as an additional selectable parameter, averaged per sampling height.
        const timestampsByIndex = new Map(
            normalizedTimes
                .map(({ index, timestamp }) => [index, new Date(timestamp).getTime()])
                .filter(([, value]) => Number.isFinite(value))
        );
        if (timestampsByIndex.size > 0) {
            const firstTimestamp = Math.min(...timestampsByIndex.values());
            const timeBucketsByHeight = new Map();

            normalizedHeights.forEach(({ index, height }) => {
                const timestampMs = timestampsByIndex.get(index);
                if (!Number.isFinite(timestampMs)) {
                    return;
                }

                const elapsedMinutes = (timestampMs - firstTimestamp) / 60000;
                const bucket = timeBucketsByHeight.get(height) || { sum: 0, count: 0 };
                bucket.sum += elapsedMinutes;
                bucket.count += 1;
                timeBucketsByHeight.set(height, bucket);
            });

            if (timeBucketsByHeight.size > 0) {
                const timePoints = Array.from(timeBucketsByHeight.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([height, bucket]) => ({
                        x: bucket.sum / bucket.count,
                        y: height
                    }));

                seriesByVariable.tiempo = timePoints;
                variableConfig.tiempo = {
                    label: VARIABLE_LABELS.tiempo,
                    color: '#2563eb',
                    borderWidth: 2
                };
            }
        }

        if (Object.keys(seriesByVariable).length === 0) {
            const countsByHeight = new Map();
            normalizedHeights.forEach(({ height }) => {
                countsByHeight.set(height, (countsByHeight.get(height) || 0) + 1);
            });

            const countPoints = Array.from(countsByHeight.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([height, count]) => ({ x: count, y: height }));

            seriesByVariable.observations = countPoints;
            variableConfig.observations = {
                label: VARIABLE_LABELS.observations,
                color: '#2563eb',
                borderWidth: 2
            };
        }

        const availableVariables = Object.keys(seriesByVariable);
        const defaultSelected = DEFAULT_SELECTED_VARIABLES.filter((name) => availableVariables.includes(name));
        if (defaultSelected.length === 0 && availableVariables.length > 0) {
            defaultSelected.push(availableVariables[0]);
        }

        const orderedTimestamps = Array.from(new Set(normalizedTimes.map((entry) => entry.timestamp)))
            .sort((a, b) => new Date(a) - new Date(b));
        const orderedHeights = Array.from(new Set(normalizedHeights.map((entry) => entry.height)))
            .sort((a, b) => a - b);
        const firstHeight = orderedHeights.length > 0 ? orderedHeights[0] : null;
        const lastHeight = orderedHeights.length > 0 ? orderedHeights[orderedHeights.length - 1] : null;
        const heightRangeLabel = (firstHeight !== null && lastHeight !== null)
            ? `${formatNumericValue(firstHeight)} m - ${formatNumericValue(lastHeight)} m`
            : '—';

        return {
            seriesByVariable,
            variableConfig,
            defaultSelected,
            sampleCount: sampleCountFromSource ?? normalizedHeights.length,
            periodLabel: buildPeriodLabel(orderedTimestamps),
            heightRangeLabel,
            sampledLabel: wasSampled ? sampledLabel : ''
        };
    }

    function extractSampleCount(...candidates) {
        for (const candidate of candidates) {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
                continue;
            }
            const size = Number(candidate.size);
            if (Number.isFinite(size) && size >= 0) {
                return size;
            }
        }
        return null;
    }

    function renderChart(chartData) {
        if (!chartCanvas || !chartData) {
            return;
        }

        if (currentChart) {
            currentChart.destroy();
        }

        const selectedVariables = ChartHelpers.getSelectedValues('#variable-checkboxes');
        const datasets = [];

        selectedVariables.forEach((variableName) => {
            const series = chartData.seriesByVariable[variableName];
            if (!Array.isArray(series) || series.length === 0) {
                return;
            }

            const config = chartData.variableConfig[variableName] || {
                label: beautifyLabel(variableName),
                color: getColorForVariable(variableName),
                borderWidth: 2
            };

            datasets.push({
                label: config.label,
                data: series,
                borderColor: config.color,
                backgroundColor: `${config.color}22`,
                borderWidth: config.borderWidth,
                pointRadius: 1.5,
                pointHoverRadius: 4,
                pointBackgroundColor: config.color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                fill: false,
                tension: 0.15,
                spanGaps: true
            });
        });

        if (datasets.length === 0) {
            notifications.info('Select at least one variable with data to display the chart.');
            return;
        }

        ChartHelpers.enhanceLineDatasets(datasets);

        const tooltipConfig = ChartHelpers.getTooltipConfig();
        tooltipConfig.callbacks = {
            title: (context) => {
                const height = context[0]?.parsed?.y;
                if (!Number.isFinite(height)) {
                    return '';
                }
                return `Height: ${formatNumericValue(height)} m`;
            },
            label: (context) => `${context.dataset.label}: ${formatNumericValue(context.parsed.x)}`
        };

        const xAxis = ChartHelpers.getAxisConfig({ titleText: 'Parameter value', type: 'linear' });
        xAxis.ticks = { ...xAxis.ticks, maxRotation: 0, minRotation: 0 };
        const yAxis = ChartHelpers.getAxisConfig({ titleText: 'Sampling height (m)', type: 'linear' });
        yAxis.ticks = { ...yAxis.ticks, maxRotation: 0, minRotation: 0 };

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
                        text: 'Radiosounding parameter vertical profile',
                        font: { size: 16, weight: 'bold', family: C.CHART_FONT_FAMILY },
                        padding: 20,
                        color: C.CHART_TITLE_COLOR
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 12,
                            font: { size: 11, family: C.CHART_FONT_FAMILY },
                            color: C.CHART_TITLE_COLOR,
                            usePointStyle: true
                        }
                    },
                    tooltip: tooltipConfig
                },
                scales: {
                    x: xAxis,
                    y: yAxis
                }
            }
        });
    }

    function updateChart() {
        if (!currentChartData) {
            return;
        }
        renderChart(currentChartData);
    }

    function closeChartModal() {
        ModalManager.close(chartModal, {
            onClose: () => {
                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }
                currentChartData = null;
                variableCheckboxesContainer.innerHTML = '';
                chartMetadata.innerHTML = '';
            }
        });
    }

    function buildTimeRangeClauses(startDate, endDate) {
        const isoStart = toIsoString(startDate);
        const isoEnd = toIsoString(endDate);
        const clauses = [];

        if (isoStart && isoEnd) {
            clauses.push(`result_time_start<='${isoEnd}'`);
            clauses.push(`result_time_end>='${isoStart}'`);
        } else if (isoStart) {
            clauses.push(`result_time_end>='${isoStart}'`);
        } else if (isoEnd) {
            clauses.push(`result_time_start<='${isoEnd}'`);
        }

        return clauses;
    }

    function getGeometryPointCount(geometry) {
        if (!geometry || !geometry.type) {
            return '—';
        }

        if (geometry.type === 'LineString') {
            return Array.isArray(geometry.coordinates) ? geometry.coordinates.length : '—';
        }

        if (geometry.type === 'MultiLineString') {
            if (!Array.isArray(geometry.coordinates)) {
                return '—';
            }
            return geometry.coordinates.reduce((sum, line) => {
                return sum + (Array.isArray(line) ? line.length : 0);
            }, 0);
        }

        return '—';
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === 'object' && Array.isArray(value.values)) {
            return value.values;
        }

        return [];
    }

    function normalizeTimestamp(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date.toISOString();
    }

    function shouldExcludeMeasure(variableName) {
        if (!variableName) {
            return true;
        }

        if (NON_NUMERIC_MEASURES.has(variableName)) {
            return true;
        }

        return variableName.endsWith('_geometry');
    }

    function toFiniteNumber(value) {
        if (value === null || value === undefined || value === '' || value === C.WFS_INVALID_VALUE) {
            return null;
        }

        const normalized = typeof value === 'string' ? value.trim() : value;
        if (normalized === '') {
            return null;
        }

        const number = typeof normalized === 'number' ? normalized : Number(normalized);
        if (!Number.isFinite(number)) {
            return null;
        }

        return number;
    }

    function downsamplePoints(points, maxPoints) {
        if (!Array.isArray(points) || points.length <= maxPoints) {
            return points;
        }

        const step = Math.ceil(points.length / maxPoints);
        const sampled = points.filter((_, index) => index % step === 0);

        const lastOriginal = points[points.length - 1];
        const lastSampled = sampled[sampled.length - 1];
        if (!lastSampled || lastSampled.x !== lastOriginal.x || lastSampled.y !== lastOriginal.y) {
            sampled.push(lastOriginal);
        }

        return sampled;
    }

    function formatNumericValue(value) {
        if (!Number.isFinite(value)) {
            return '—';
        }

        if (Math.abs(value) >= 1000) {
            return value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
        }

        const rounded = value.toFixed(4);
        return rounded.replace(/\.?0+$/, '');
    }

    function buildPeriodLabel(timestamps) {
        if (!Array.isArray(timestamps) || timestamps.length === 0) {
            return '—';
        }

        const first = timestamps[0];
        const last = timestamps[timestamps.length - 1];
        return `${formatDateTime(first)} - ${formatDateTime(last)}`;
    }

    function getColorForVariable(variableName) {
        let hash = 0;
        for (let i = 0; i < variableName.length; i += 1) {
            hash = ((hash << 5) - hash) + variableName.charCodeAt(i);
            hash |= 0;
        }

        const index = Math.abs(hash) % COLOR_PALETTE.length;
        return COLOR_PALETTE[index];
    }

    function beautifyLabel(text) {
        if (!text) {
            return 'Variable';
        }

        return text
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
});

