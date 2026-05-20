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
    const featureModal = document.getElementById('feature-modal');
    const featureModalContent = document.getElementById('feature-modal-content');
    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('snow-height-chart');
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

    const C = SHARED_CONSTANTS;
    const DEFAULT_SCHEMA = 'meteostations_meteogalicia';
    const MAX_RENDERED_ROWS = 500;
    const MAX_RENDERED_MAP_FEATURES = 1500;

    // ============================================
    // PROCESS CONFIGURATION (meteostations-specific)
    // ============================================
    const PROCESS_CONFIG = {
        'snow_height_10minutes_process': {
            wfsLayer: 'ccmm:observation_snow_height_10minutes_process_wfs',
            valueProperty: 'snow_height',
            flagProperty: 'snow_height_validation_flag',
            displayName: 'Snow depth',
            unit: 'cm',
            pageTitle: 'Meteorological stations - Snow depth',
            showFlags: false
        },
        'precipitation_10minutes_process': {
            wfsLayer: 'ccmm:observation_precipitation_10minutes_process_wfs',
            valueProperty: 'rainfall',
            flagProperty: 'rainfall_validation_flag',
            displayName: 'Precipitation',
            unit: 'mm',
            pageTitle: 'Meteorological stations - Precipitation',
            showFlags: false
        },
        'pressure_10minutes_process': {
            wfsLayer: 'ccmm:observation_pressure_10minutes_process_wfs',
            valueProperties: [
                { property: 'barometric_pressure', displayName: 'Barometric pressure', unit: 'hPa' },
                { property: 'sea_level_reduced_pressure', displayName: 'Sea-level pressure', unit: 'hPa' }
            ],
            displayName: 'Atmospheric pressure',
            unit: '',
            pageTitle: 'Meteorological stations - Pressure',
            showFlags: false
        },
        'solar_radiation_10minutes_process': {
            wfsLayer: 'ccmm:observation_solar_radiation_10minutes_process_wfs',
            valueProperties: [
                { property: 'sunshine_duration', displayName: 'Sunshine duration', unit: 'h' },
                { property: 'global_solar_radiation', displayName: 'Global solar radiation', unit: 'W/m²' }
            ],
            displayName: 'Solar radiation',
            unit: '',
            pageTitle: 'Meteorological stations - Solar radiation',
            showFlags: false
        },
        'temperature_humidity_10minutes_process': {
            wfsLayer: 'ccmm:observation_temperature_humidity_10minutes_process_wfs',
            valueProperties: [
                { property: 'relative_humidity', displayName: 'Relative humidity', unit: '%' },
                { property: 'mean_air_temperature', displayName: 'Air temperature', unit: '°C' },
                { property: 'dew_temperature', displayName: 'Dew point temperature', unit: '°C' }
            ],
            displayName: 'Temperature and humidity',
            unit: '',
            pageTitle: 'Meteorological stations - Temperature and humidity',
            showFlags: false
        },
        'surface_temperature_10minutes_process': {
            wfsLayer: 'ccmm:observation_surface_temperature_10minutes_process_wfs',
            valueProperties: [
                { property: 'mean_air_temperature', displayName: 'Air temperature', unit: '°C' },
                { property: 'soil_temperature', displayName: 'Soil temperature', unit: '°C' }
            ],
            displayName: 'Temperatures',
            unit: '°C',
            pageTitle: 'Meteorological stations - Temperatures',
            showFlags: false
        },
        'wind_10minutes_process': {
            wfsLayer: 'ccmm:observation_wind_10minutes_process_wfs',
            valueProperties: [
                { property: 'wind_direction', displayName: 'Wind direction', unit: 'deg' },
                { property: 'wind_speed', displayName: 'Wind speed', unit: 'm/s' },
                { property: 'wind_gust_direction', displayName: 'Gust direction', unit: 'deg' },
                { property: 'wind_gust_speed', displayName: 'Gust speed', unit: 'm/s' },
                { property: 'wind_direction_standard_deviation', displayName: 'Wind direction std. dev.', unit: 'deg' },
                { property: 'wind_speed_standard_deviation', displayName: 'Wind speed std. dev.', unit: 'm/s' }
            ],
            displayName: 'Wind',
            unit: '',
            pageTitle: 'Meteorological stations - Wind',
            showFlags: false
        }
    };

    // ============================================
    // URL PARAMETERS & INITIALIZATION
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = (urlParams.get('schema') || DEFAULT_SCHEMA).trim() || DEFAULT_SCHEMA;
    const nameParam = urlParams.get('name');
    const procedureParam = urlParams.get('procedure');
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    // Update the back-to-process link
    const backLink = document.getElementById('back-link');
    if (backLink) {
        const backSchema = schemaParam || DEFAULT_SCHEMA;
        const backName = nameParam || 'snow_height_10minutes_process';
        backLink.href = `process-type.html?schema=${encodeURIComponent(backSchema)}&name=${encodeURIComponent(backName)}`;
    }

    // Detect and load the process configuration
    if (nameParam && PROCESS_CONFIG[nameParam]) {
        currentProcess = PROCESS_CONFIG[nameParam];
        document.title = currentProcess.pageTitle;
        const headerTitle = document.querySelector('.page-hero__content h1');
        if (headerTitle) {
            headerTitle.textContent = currentProcess.pageTitle;
        }
    } else if (nameParam) {
        DomHelpers.setStatus(statusEl, `Unsupported process: ${nameParam}`, 'error');
        searchButton.disabled = true;
        if (startDateInput) startDateInput.disabled = true;
        if (endDateInput) endDateInput.disabled = true;
        if (proceduresInput) proceduresInput.disabled = true;
        DomHelpers.renderEmptyState(resultsSection, `Process "${nameParam}" is not supported. Available processes: ${Object.keys(PROCESS_CONFIG).join(', ')}`);
        return;
    }

    form.dataset.schema = schemaParam;
    form.dataset.name = nameParam || '';
    if (procedureParam) proceduresInput.value = procedureParam;

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

    // Meteostations has custom geometry rendering with async popup loading
    function renderGeometries(geometries) {
        if (!geometries || !Array.isArray(geometries.features)) return;

        availabilityLayer.clearLayers();
        const availabilityStats = availabilityStyling.computeStats(geometries);
        MapManager.renderGeometries(map, availabilityLayer, geometries, {
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

        DomHelpers.setStatus(statusEl, 'Querying station data...', 'loading');
        destroyResultsMap();
        DomHelpers.renderEmptyState(resultsSection, 'Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const typeName = currentProcess ? currentProcess.wfsLayer : 'ccmm:observation_snow_height_10minutes_process_wfs';
            const wfsUrl = WfsClient.buildUrl(typeName, {
                bbox: currentBoundingBox,
                startDate,
                endDate,
                procedures
            });
            const data = await WfsClient.fetchData(wfsUrl);

            if (!data || !Array.isArray(data.features) || data.features.length === 0) {
                destroyResultsMap();
                DomHelpers.renderEmptyState(resultsSection, 'No station data was found for the selected criteria.');
                DomHelpers.setStatus(statusEl, 'No results.', 'info');
                return;
            }

            renderResults(data);
            DomHelpers.setStatus(statusEl, `Found ${data.features.length} station observations.`, 'success');
            scheduleAvailabilityRefresh();
        } catch (error) {
            Logger.error('Error fetching stations data:', error);
            destroyResultsMap();
            const detail = error?.details ? sanitize(String(error.details)) : '';
            DomHelpers.renderEmptyState(resultsSection, 'Unable to retrieve data. Please try again later.', detail);
            DomHelpers.setStatus(statusEl, 'Error querying station data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
        }
    });

    // ============================================
    // RESULTS RENDERING (meteostations-specific)
    // ============================================
    function renderResults(featureCollection) {
        destroyResultsMap();
        resultsSection.innerHTML = '';

        const allFeatures = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
        const features = allFeatures.slice(0, MAX_RENDERED_ROWS);

        // Sort by process and then by date
        features.sort((a, b) => {
            const procA = a.properties?.procedure ?? 0;
            const procB = b.properties?.procedure ?? 0;
            if (procA !== procB) return procA - procB;
            const timeA = new Date(a.properties?.result_time || 0).getTime();
            const timeB = new Date(b.properties?.result_time || 0).getTime();
            return timeA - timeB;
        });

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
            CsvExporter.exportFeatures(allFeatures, 'meteorological-station-observations', {
                fieldOrder: ['procedure', 'result_time', 'feature_of_interest'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time: 'Date',
                    feature_of_interest: 'FeatureOfInterest'
                }
            });
        });
        exportBtn.style.marginTop = '0.5rem';
        headerDiv.appendChild(exportBtn);

        resultsSummary.appendChild(headerDiv);

        const subtitleEl = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(allFeatures.length);
        subtitleEl.append('Found ', countStrong, ' station observations');
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
        resultsMapTitle.textContent = 'Result features of interest';

        const resultsMapContainer = document.createElement('div');
        resultsMapContainer.className = 'results-map-panel__container';
        const mapContainerId = `results-map-${resultsMapIdCounter++}`;
        resultsMapContainer.id = mapContainerId;

        resultsMapPanel.appendChild(resultsMapTitle);
        resultsMapPanel.appendChild(resultsMapContainer);
        resultsSection.appendChild(resultsMapPanel);

        renderResultsMap(mapContainerId, featureCollection);

        const list = document.createElement('div');
        list.className = 'meteostation-feature-list meteostation-feature-list--grid';

        const createRow = (cells, isHeader = false) => {
            const row = document.createElement('div');
            row.className = `meteostation-grid-row${isHeader ? ' meteostation-grid-row--header' : ''}`;
            cells.forEach((content) => {
                const cell = document.createElement('span');
                cell.className = isHeader
                    ? 'meteostation-grid-row__cell meteostation-grid-row__cell--header'
                    : 'meteostation-grid-row__cell';

                if (content instanceof HTMLElement) {
                    cell.appendChild(content);
                } else {
                    cell.textContent = content;
                }
                row.appendChild(cell);
            });
            return row;
        };

        // Header row - handle multiple value properties
        const headerCells = ['Process', 'Date', 'Feature of Interest'];
        if (currentProcess?.valueProperties) {
            currentProcess.valueProperties.forEach(vp => headerCells.push(vp.displayName));
        } else {
            const valueColumnName = currentProcess ? currentProcess.displayName : 'Snow depth';
            const flagColumnName = currentProcess ? `${currentProcess.displayName} (flag)` : 'Flag';
            headerCells.push(valueColumnName);
            if (currentProcess?.showFlags !== false) headerCells.push(flagColumnName);
        }
        list.appendChild(createRow(headerCells, true));

        // Data rows
        features.forEach((feature) => {
            const props = feature?.properties || {};
            const procedure = formatValue(props.procedure);
            const resultTime = formatDateTime(props.result_time);
            const foi = formatValue(props.feature_of_interest);
            const rowCells = [procedure, resultTime, foi];

            if (currentProcess?.valueProperties) {
                currentProcess.valueProperties.forEach(vp => rowCells.push(formatValue(props[vp.property])));
            } else {
                const valueProperty = currentProcess ? currentProcess.valueProperty : 'snow_height';
                const flagProperty = currentProcess ? currentProcess.flagProperty : 'snow_height_validation_flag';
                rowCells.push(formatValue(props[valueProperty]));
                if (currentProcess?.showFlags !== false) rowCells.push(formatValue(props[flagProperty]));
            }

            list.appendChild(createRow(rowCells));
        });

        resultsSection.appendChild(list);
    }

    function createResultMetadataTooltip(feature) {
        const props = feature?.properties || {};
        const procedure = formatValue(props.procedure);
        const resultTime = formatDateTime(props.result_time);
        const foi = formatValue(props.feature_of_interest);

        return `
            <div class="availability-tooltip">
                <div class="availability-tooltip__row">
                    <span class="availability-tooltip__key">Process</span>
                    <span class="availability-tooltip__value">${sanitize(String(procedure))}</span>
                </div>
                <div class="availability-tooltip__row">
                    <span class="availability-tooltip__key">Date</span>
                    <span class="availability-tooltip__value">${sanitize(String(resultTime))}</span>
                </div>
                <div class="availability-tooltip__row">
                    <span class="availability-tooltip__key">FOI</span>
                    <span class="availability-tooltip__value">${sanitize(String(foi))}</span>
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

        L.tileLayer(SHARED_CONSTANTS.OSM_TILE_URL, {
            attribution: SHARED_CONSTANTS.OSM_ATTRIBUTION,
            maxZoom: SHARED_CONSTANTS.MAP_MAX_ZOOM
        }).addTo(resultsMap);

        resultsMapLayer = L.geoJSON(dataForMap, {
            pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                radius: 6.5,
                fillColor: '#2563eb',
                color: '#1e3a8a',
                weight: 1.8,
                fillOpacity: 0.82
            }),
            onEachFeature: (feature, layer) => {
                if (layer.bindTooltip) {
                    layer.bindTooltip(createResultMetadataTooltip(feature), {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'availability-tooltip-container'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.setStyle) {
                        layer.setStyle({
                            radius: 8,
                            fillColor: '#1d4ed8',
                            color: '#172554',
                            weight: 2.2,
                            fillOpacity: 0.92,
                            opacity: 1
                        });
                    }
                    if (layer.openTooltip) layer.openTooltip();
                    if (layer.bringToFront) layer.bringToFront();
                });

                layer.on('mouseout', () => {
                    if (resultsMapLayer?.resetStyle) {
                        resultsMapLayer.resetStyle(layer);
                    }
                    if (layer.closeTooltip) layer.closeTooltip();
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
            ChartHelpers.downloadChart(currentChart, 'station-time-series');
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

        if (currentProcess?.valueProperties) {
            // Multiple value properties - create dataset per process and value property
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
        } else {
            // Single value property - group by process
            const processGroups = {};
            const valueProperty = currentProcess ? currentProcess.valueProperty : 'snow_height';
            features.forEach(feature => {
                const proc = String(feature.properties?.procedure);
                if (!selectedProcs.includes(proc)) return;

                const value = feature.properties?.[valueProperty];
                if (value === C.WFS_INVALID_VALUE || value === null || value === undefined) return;

                if (!processGroups[proc]) processGroups[proc] = [];
                processGroups[proc].push({ x: feature.properties?.result_time, y: value });
            });

            datasets = Object.keys(processGroups).map((procId, index) => {
                const color = C.PROCESS_COLORS[index % C.PROCESS_COLORS.length];
                return {
                    label: `Process ${procId}`, data: processGroups[procId],
                    borderColor: color, backgroundColor: color + '20',
                    borderWidth: 2, pointRadius: 2, pointHoverRadius: 5,
                    pointBackgroundColor: color, pointBorderColor: '#ffffff', pointBorderWidth: 1,
                    fill: false, tension: 0.1, spanGaps: true,
                    _unit: currentProcess?.unit || ''
                };
            });
        }

        // Sort data points by time
        datasets.forEach(ds => ds.data.sort((a, b) => new Date(a.x) - new Date(b.x)));

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
                const unit = context.dataset._unit || (currentProcess ? currentProcess.unit : '');
                return `${context.dataset.label}: ${context.parsed.y} ${unit}`;
            }
        };

        const xAxis = ChartHelpers.getAxisConfig({ titleText: 'Date', type: 'time' });
        xAxis.time = {
            displayFormats: { hour: 'dd/MM HH:mm', day: 'dd/MM/yyyy', month: 'MM/yyyy' },
            tooltipFormat: 'Pp'
        };
        xAxis.ticks = { ...xAxis.ticks, maxRotation: 45 };

        const yTitle = currentProcess ? `${currentProcess.displayName} (${currentProcess.unit})` : 'Snow depth (cm)';

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
                        text: currentProcess ? `${currentProcess.displayName} - Time series` : 'Snow depth - Time series',
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
                    y: ChartHelpers.getAxisConfig({ titleText: yTitle })
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

