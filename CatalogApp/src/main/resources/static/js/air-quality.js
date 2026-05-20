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
    const backLink = document.getElementById('back-link');
    const pageTitle = document.getElementById('page-title');

    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('air-quality-chart');
    const variableCheckboxesContainer = document.getElementById('variable-checkboxes');
    const selectAllVarsBtn = document.getElementById('select-all-vars');
    const deselectAllVarsBtn = document.getElementById('deselect-all-vars');
    const downloadChartBtn = document.getElementById('download-chart');
    const chartMetadata = document.getElementById('chart-metadata');

    if (!form || !startDateInput || !endDateInput || !proceduresInput || !statusEl || !availabilitySection || !resultsSection ||
        !searchButton || !clearBboxButton || !bboxDisplay || !chartModal || !chartCanvas ||
        !variableCheckboxesContainer || !selectAllVarsBtn || !deselectAllVarsBtn || !downloadChartBtn || !chartMetadata) {
        Logger.error('Air Quality: required DOM elements are missing.');
        return;
    }

    const C = SHARED_CONSTANTS;
    const DEFAULT_SCHEMA = 'air_quality';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 3000;
    const MAX_CHART_FEATURES = 4000;
    const TIMESTAMP_FIELDS = ['result_time', 'phenomenon_time', 'phenomenon_time_start', 'result_time_start'];
    const COLOR_PALETTE = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
        '#ec4899', '#64748b'
    ];

    const PROCESS_CONFIG = {
        sensor_low_cost_process: {
            displayName: 'Sensor low-cost',
            pageTitle: 'Air quality - Low-cost sensor',
            wfsLayer: 'ccmm:observation_sensor_low_cost_process_wfs',
            mapColor: '#0ea5e9',
            displayColumns: [
                { key: 'temperature', label: 'Temp. (C)' },
                { key: 'humidity', label: 'Humidity (%)' },
                { key: 'battery_voltage', label: 'Battery (V)' },
                { key: 'no2_we', label: 'NO2 WE' },
                { key: 'co_we', label: 'CO WE' }
            ],
            defaultChartVariables: ['temperature', 'humidity', 'battery_voltage']
        },
        sensor_calibration_process: {
            displayName: 'Sensor calibration',
            pageTitle: 'Air quality - Sensor calibration',
            wfsLayer: 'ccmm:observation_sensor_calibration_process_wfs',
            mapColor: '#f97316',
            displayColumns: [
                { key: 'co', label: 'CO' },
                { key: 'no', label: 'NO' },
                { key: 'no2', label: 'NO2' },
                { key: 'o3', label: 'O3' },
                { key: 'coverage', label: 'Coverage' }
            ],
            defaultChartVariables: ['no', 'no2', 'o3']
        },
        aq_legal_station_process: {
            displayName: 'AQ legal station',
            pageTitle: 'Air quality - Legal station',
            wfsLayer: 'ccmm:observation_aq_legal_station_process_wfs',
            mapColor: '#22c55e',
            displayColumns: [
                { key: 'co', label: 'CO' },
                { key: 'no', label: 'NO' },
                { key: 'no2', label: 'NO2' },
                { key: 'o3', label: 'O3' },
                { key: 'nox', label: 'NOx' }
            ],
            defaultChartVariables: ['no2', 'o3', 'nox']
        },
        air_quality_model: {
            displayName: 'Air quality model',
            pageTitle: 'Air quality - Model',
            wfsLayer: 'ccmm:observation_air_quality_model_wfs',
            mapColor: '#8b5cf6',
            displayColumns: [
                { key: 'phenomenon_time_start', label: 'Phenomenon start', type: 'datetime' },
                { key: 'phenomenon_time_end', label: 'Phenomenon end', type: 'datetime' }
            ],
            defaultChartVariables: ['observations']
        }
    };

    const VARIABLE_LABELS = {
        co: 'CO',
        no: 'NO',
        no2: 'NO2',
        o3: 'O3',
        nox: 'NOx',
        temperature: 'Temperature (C)',
        humidity: 'Humidity (%)',
        battery_voltage: 'Battery (V)',
        no_we: 'NO WE',
        no_aux: 'NO AUX',
        no2_we: 'NO2 WE',
        no2_aux: 'NO2 AUX',
        ox_we: 'OX WE',
        ox_aux: 'OX AUX',
        co_we: 'CO WE',
        co_aux: 'CO AUX',
        co_concentration: 'CO concentration',
        no_concentration: 'NO concentration',
        no2_concentration: 'NO2 concentration',
        ox_concentration: 'OX concentration',
        coverage: 'Coverage',
        observations: 'Observations per instant'
    };

    const EXCLUDED_CHART_FIELDS = new Set([
        'procedure',
        'feature_of_interest',
        'featureOfInterest',
        'geometry_name',
        'temporal_spatial_subsamples',
        'bbox',
        'id'
    ]);

    let currentBoundingBox = null;
    let availabilityFetchTimeout = null;
    let availabilityController = null;
    let currentChart = null;
    let currentChartData = null;

    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = (urlParams.get('schema') || DEFAULT_SCHEMA).trim() || DEFAULT_SCHEMA;
    const nameParam = (urlParams.get('name') || 'sensor_low_cost_process').trim();
    const procedureParam = (urlParams.get('procedure') || '').trim();
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    const currentProcess = PROCESS_CONFIG[nameParam];

    if (!currentProcess) {
        DomHelpers.setStatus(statusEl, `Unsupported process: ${nameParam || 'unnamed'}`, 'error');
        searchButton.disabled = true;
        startDateInput.disabled = true;
        endDateInput.disabled = true;
        proceduresInput.disabled = true;
        DomHelpers.renderEmptyState(resultsSection, 'This view does not support the selected air quality process.');
        return;
    }

    form.dataset.schema = schemaParam;
    form.dataset.name = nameParam;

    if (backLink) {
        backLink.href = `process-type.html?schema=${encodeURIComponent(schemaParam)}&name=${encodeURIComponent(nameParam)}`;
    }

    if (pageTitle) {
        pageTitle.textContent = currentProcess.pageTitle;
    }
    document.title = `Lendas - ${currentProcess.pageTitle}`;

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
    const availabilityStyling = AvailabilityStyle.createController(map, {
        colorStops: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a']
    });
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
        ChartHelpers.downloadChart(currentChart, 'air-quality-time-series');
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

        DomHelpers.setStatus(statusEl, `Querying ${currentProcess.displayName} data...`, 'loading');
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const wfsUrl = WfsClient.buildUrl(currentProcess.wfsLayer, {
                bbox: currentBoundingBox,
                startDate,
                endDate,
                procedures
            });

            const data = await WfsClient.fetchData(wfsUrl);

            const features = Array.isArray(data?.features) ? data.features : [];
            if (features.length === 0) {
                searchResultsLayer.clearLayers();
                DomHelpers.renderEmptyState(resultsSection, 'No air quality data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            renderSearchGeometries(data);
            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${features.length} observations for ${currentProcess.displayName}.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Air Quality: error querying WFS:', error);
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying air quality data.', 'error');
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

        // Avoid unbounded availability queries on large datasets.
        if (!procedures && !currentBoundingBox) {
            availabilityLayer.clearLayers();
            availabilityStyling.clearLegend();
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
            Logger.error('Air Quality: error fetching availability:', error);
            availabilityLayer.clearLayers();
            availabilityStyling.clearLegend();
            AvailabilityRenderer.renderPeriodsSummary(availabilitySection, []);
            DomHelpers.setStatus(statusEl, 'Availability could not be retrieved.', 'error');
        } finally {
            availabilityController = null;
        }
    }

    function renderAvailabilityGeometries(geometries) {
        const availabilityStats = availabilityStyling.computeStats(geometries);
        MapManager.renderGeometries(map, availabilityLayer, geometries, {
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
            tooltipFactory: createAvailabilityTooltip,
            popupTrigger: 'hover',
            tooltipOptions: {
                sticky: true,
                direction: 'top',
                opacity: 0.95,
                className: 'availability-tooltip-container'
            }
        });
        availabilityStyling.updateLegend(availabilityStats);
    }

    function createAvailabilityTooltip(feature) {
        const observations = feature?.properties?.observations ?? '—';
        return `
            <div class="availability-tooltip">
                <div class="availability-tooltip__row">
                    <span class="availability-tooltip__key">Observations</span>
                    <span class="availability-tooltip__value">${sanitize(String(observations))}</span>
                </div>
            </div>
        `;
    }

    function renderSearchGeometries(featureCollection) {
        searchResultsLayer.clearLayers();

        const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        const limitedFeatures = features.length > MAX_RENDERED_MAP_FEATURES
            ? features.slice(0, MAX_RENDERED_MAP_FEATURES)
            : features;

        const dataForMap = limitedFeatures.length === features.length
            ? featureCollection
            : { ...featureCollection, features: limitedFeatures };

        const geoJson = L.geoJSON(dataForMap, {
            style: {
                color: '#1d4ed8',
                weight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 0.2
            },
            pointToLayer: (_, latlng) => L.circleMarker(latlng, {
                radius: 6,
                fillColor: '#2563eb',
                color: '#1e3a8a',
                weight: 2,
                fillOpacity: 0.8
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(createResultPopup(feature));
            }
        });

        geoJson.addTo(searchResultsLayer);
        if (geoJson.getBounds().isValid()) {
            map.fitBounds(geoJson.getBounds(), { padding: [30, 30] });
        }
    }

    function createResultPopup(feature) {
        const props = feature?.properties || {};
        const timestamp = getTimestampValue(props);
        const items = [
            `<strong>Process:</strong> ${sanitize(String(formatValue(props.procedure)))}`,
            `<strong>Date:</strong> ${sanitize(String(formatDateTime(timestamp)))}`,
            `<strong>Feature of Interest:</strong> ${sanitize(String(formatValue(props.feature_of_interest)))}`
        ];

        currentProcess.displayColumns.forEach((column) => {
            const raw = props[column.key];
            const value = column.type === 'datetime' ? formatDateTime(raw) : formatDisplayValue(raw);
            items.push(`<strong>${sanitize(column.label)}:</strong> ${sanitize(String(value))}`);
        });

        return `<div class="aq-popup">${items.join('<br>')}</div>`;
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

        const chartButton = document.createElement('button');
        chartButton.type = 'button';
        chartButton.className = 'chart-control-btn chart-control-btn--primary';
        chartButton.textContent = 'View chart';
        chartButton.addEventListener('click', () => openChartModal(features));

        summaryHeader.appendChild(titleEl);
        summaryHeader.appendChild(chartButton);

        // Add export button below chart button
        const exportBtn = CsvExporter.createButton(() => {
            CsvExporter.exportFeatures(features, `air-quality-${currentProcess.name}`, {
                fieldOrder: ['procedure', 'result_time', 'feature_of_interest'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time: 'Date',
                    feature_of_interest: 'FeatureOfInterest'
                }
            });
        });
        exportBtn.style.marginTop = '0.5rem';
        summaryHeader.appendChild(exportBtn);

        const subtitleEl = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(features.length);
        subtitleEl.append('Found ', countStrong, ` observations for ${currentProcess.displayName}.`);

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

        const list = document.createElement('div');
        list.className = 'aq-feature-list';

        const headers = ['Process', 'Date', ...currentProcess.displayColumns.map((column) => column.label)];
        const gridTemplateColumns = buildGridTemplate(headers.length);

        list.appendChild(createRow(headers, true, gridTemplateColumns));

        renderedFeatures.forEach((feature) => {
            const props = feature?.properties || {};
            const rowCells = [
                formatDisplayValue(props.procedure),
                formatDateTime(getTimestampValue(props))
            ];

            currentProcess.displayColumns.forEach((column) => {
                const raw = props[column.key];
                rowCells.push(column.type === 'datetime' ? formatDateTime(raw) : formatDisplayValue(raw));
            });

            list.appendChild(createRow(rowCells, false, gridTemplateColumns));
        });

        resultsSection.appendChild(list);
    }

    function createRow(cells, isHeader, gridTemplateColumns) {
        const row = document.createElement('div');
        row.className = isHeader ? 'aq-grid-row aq-grid-row--header' : 'aq-grid-row';
        row.style.gridTemplateColumns = gridTemplateColumns;

        cells.forEach((content) => {
            const cell = document.createElement('span');
            cell.className = isHeader ? 'aq-grid-row__cell aq-grid-row__cell--header' : 'aq-grid-row__cell';
            cell.textContent = content;
            row.appendChild(cell);
        });

        return row;
    }

    function buildGridTemplate(columnCount) {
        if (columnCount <= 3) {
            return 'minmax(120px, 0.8fr) minmax(220px, 1.2fr) minmax(160px, 1fr)';
        }

        const extraColumns = new Array(columnCount - 3).fill('minmax(120px, 1fr)').join(' ');
        return `minmax(110px, 0.8fr) minmax(220px, 1.3fr) minmax(160px, 1fr) ${extraColumns}`;
    }

    function openChartModal(features) {
        if (!Array.isArray(features) || features.length === 0) {
            notifications.warning('There is no data to plot.');
            return;
        }

        const chartData = buildChartData(features);
        if (!chartData || chartData.timestamps.length === 0) {
            notifications.warning('There is not enough temporal information to generate the chart.');
            return;
        }

        currentChartData = chartData;

        const modalTitle = document.getElementById('chart-modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Time series - ${currentProcess.displayName}`;
        }

        chartMetadata.innerHTML = `
            <span><strong>Process:</strong> ${sanitize(currentProcess.displayName)}</span>
            <span><strong>Observations:</strong> ${sanitize(String(features.length))}</span>
            <span><strong>Period:</strong> ${sanitize(chartData.periodLabel)}</span>
            ${chartData.sampled ? `<span><strong>Sampling:</strong> ${sanitize(chartData.sampledLabel)}</span>` : ''}
        `;

        ChartHelpers.buildVariableCheckboxes(
            variableCheckboxesContainer,
            chartData.measures,
            chartData.variableConfig,
            chartData.defaultSelected,
            updateChart
        );

        renderChart(chartData);
        ModalManager.open(chartModal);
    }

    function buildChartData(features) {
        const temporalFeatures = features.filter((feature) => getTimestampValue(feature?.properties));

        if (temporalFeatures.length === 0) {
            return null;
        }

        let sampledFeatures = temporalFeatures;
        let sampledLabel = '';
        let sampled = false;

        if (temporalFeatures.length > MAX_CHART_FEATURES) {
            sampled = true;
            const step = Math.ceil(temporalFeatures.length / MAX_CHART_FEATURES);
            sampledFeatures = temporalFeatures.filter((_, index) => index % step === 0);
            sampledLabel = `${sampledFeatures.length} of ${temporalFeatures.length} points`;
        }

        sampledFeatures = sampledFeatures
            .slice()
            .sort((a, b) => new Date(getTimestampValue(a.properties)) - new Date(getTimestampValue(b.properties)));

        const variableSeries = {};
        const timestampSet = new Set();
        const timestampCounts = new Map();

        sampledFeatures.forEach((feature) => {
            const props = feature?.properties || {};
            const timestamp = getTimestampValue(props);
            if (!timestamp) {
                return;
            }

            timestampSet.add(timestamp);
            timestampCounts.set(timestamp, (timestampCounts.get(timestamp) || 0) + 1);

            Object.entries(props).forEach(([key, value]) => {
                if (shouldExcludeChartField(key)) {
                    return;
                }

                const numericValue = toFiniteNumber(value);
                if (numericValue === null) {
                    return;
                }

                if (!variableSeries[key]) {
                    variableSeries[key] = new Map();
                }

                const bucket = variableSeries[key].get(timestamp) || { sum: 0, count: 0 };
                bucket.sum += numericValue;
                bucket.count += 1;
                variableSeries[key].set(timestamp, bucket);
            });
        });

        const timestamps = Array.from(timestampSet).sort((a, b) => new Date(a) - new Date(b));
        const measures = {};
        const variableConfig = {};

        Object.keys(variableSeries).forEach((variableName) => {
            const buckets = variableSeries[variableName];
            const values = timestamps.map((timestamp) => {
                const entry = buckets.get(timestamp);
                if (!entry) {
                    return null;
                }
                return entry.sum / entry.count;
            });

            const hasData = values.some((value) => value !== null);
            if (!hasData) {
                return;
            }

            measures[variableName] = values;
            variableConfig[variableName] = {
                label: VARIABLE_LABELS[variableName] || beautifyLabel(variableName),
                color: getColorForVariable(variableName),
                borderWidth: 2
            };
        });

        if (Object.keys(measures).length === 0) {
            const counts = timestamps.map((timestamp) => timestampCounts.get(timestamp) || 0);

            measures.observations = counts;
            variableConfig.observations = {
                label: VARIABLE_LABELS.observations,
                color: '#2563eb',
                borderWidth: 2
            };
        }

        const defaultSelected = currentProcess.defaultChartVariables.filter((name) => Object.prototype.hasOwnProperty.call(measures, name));
        if (defaultSelected.length === 0) {
            defaultSelected.push(Object.keys(measures)[0]);
        }

        return {
            timestamps,
            measures,
            variableConfig,
            defaultSelected,
            sampled,
            sampledLabel,
            periodLabel: buildPeriodLabel(timestamps)
        };
    }

    function renderChart(data) {
        if (!chartCanvas || !data) {
            return;
        }

        if (currentChart) {
            currentChart.destroy();
        }

        const selectedVariables = ChartHelpers.getSelectedValues('#variable-checkboxes');
        const datasets = [];

        selectedVariables.forEach((variableName) => {
            const values = data.measures[variableName];
            if (!Array.isArray(values)) {
                return;
            }

            const config = data.variableConfig[variableName] || {
                label: beautifyLabel(variableName),
                color: getColorForVariable(variableName),
                borderWidth: 2
            };

            const points = data.timestamps
                .map((timestamp, index) => ({ x: timestamp, y: values[index] }))
                .filter((point) => point.y !== null && Number.isFinite(point.y));

            if (points.length === 0) {
                return;
            }

            datasets.push({
                label: config.label,
                data: points,
                borderColor: config.color,
                backgroundColor: `${config.color}22`,
                borderWidth: config.borderWidth,
                pointRadius: 2,
                pointHoverRadius: 5,
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
                const timestamp = context[0]?.parsed?.x;
                if (!timestamp) {
                    return '';
                }
                return new Date(timestamp).toLocaleString('en-US', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            },
            label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y)}`
        };

        const xAxis = ChartHelpers.getAxisConfig({ titleText: 'Date', type: 'time' });
        xAxis.time = {
            displayFormats: { hour: 'dd/MM HH:mm', day: 'dd/MM/yyyy', month: 'MM/yyyy' },
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
                        text: `Time series - ${currentProcess.displayName}`,
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
                    y: ChartHelpers.getAxisConfig({ titleText: 'Value' })
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

    function shouldExcludeChartField(key) {
        if (EXCLUDED_CHART_FIELDS.has(key)) {
            return true;
        }
        if (TIMESTAMP_FIELDS.includes(key)) {
            return true;
        }
        return key.endsWith('_out_of_range');
    }

    function getTimestampValue(properties) {
        if (!properties) {
            return null;
        }

        for (const field of TIMESTAMP_FIELDS) {
            const value = properties[field];
            if (value) {
                return value;
            }
        }

        return null;
    }

    function toFiniteNumber(value) {
        if (value === null || value === undefined || value === '' || value === C.WFS_INVALID_VALUE) {
            return null;
        }

        const number = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return number;
    }

    function formatDisplayValue(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return formatNumber(value);
        }
        return formatValue(value);
    }

    function formatNumber(value) {
        if (!Number.isFinite(value)) {
            return '—';
        }

        if (Math.abs(value) >= 1000) {
            return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }

        const rounded = value.toFixed(4);
        return rounded.replace(/\.?0+$/, '');
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

    function buildPeriodLabel(timestamps) {
        if (!Array.isArray(timestamps) || timestamps.length === 0) {
            return '—';
        }

        const first = timestamps[0];
        const last = timestamps[timestamps.length - 1];
        return `${formatDateTime(first)} - ${formatDateTime(last)}`;
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

