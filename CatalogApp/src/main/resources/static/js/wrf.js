'use strict';

(function () {
    const DEFAULT_SCHEMA = 'wrf_meteogalicia';
    const DEFAULT_NAME = 'modelo_wrf';
    const DEFAULT_START_DATE = '2000-01-01T00:00';
    const DEFAULT_END_DATE = '2050-01-01T00:00';

    const WRF_WCS_LAYER_OPTIONS = [
        {
            value: '1',
            key: 'wind_direction',
            label: 'Wind direction (°)',
            legendLabel: 'Wind direction',
            colors: [
                [68, 1, 84],
                [65, 67, 135],
                [42, 120, 142],
                [32, 168, 132],
                [95, 194, 69],
                [191, 221, 34],
                [253, 231, 37]
            ]
        },
        {
            value: '2',
            key: 'wind_speed',
            label: 'Wind speed (m/s)',
            legendLabel: 'Wind speed',
            colors: [
                [59, 76, 192],
                [144, 178, 220],
                [247, 247, 247],
                [244, 165, 130],
                [178, 24, 43]
            ]
        },
        {
            value: '3',
            key: 'pressure',
            label: 'Pressure (hPa)',
            legendLabel: 'Pressure',
            colors: [
                [48, 18, 59],
                [74, 52, 128],
                [108, 82, 161],
                [184, 144, 162],
                [251, 216, 114]
            ]
        },
        {
            value: '4',
            key: 'precipitation',
            label: 'Precipitation (mm)',
            legendLabel: 'Precipitation',
            colors: [
                [237, 248, 251],
                [178, 226, 226],
                [102, 194, 164],
                [35, 139, 69],
                [0, 88, 36]
            ]
        },
        {
            value: '5',
            key: 'relative_humidity',
            label: 'Relative humidity (%)',
            legendLabel: 'Relative humidity',
            colors: [
                [13, 8, 135],
                [84, 2, 163],
                [139, 10, 165],
                [185, 50, 137],
                [219, 92, 104],
                [244, 136, 73],
                [254, 188, 43]
            ]
        },
        {
            value: '6',
            key: 'snow_amount',
            label: 'Snow amount (mm)',
            legendLabel: 'Snow amount',
            colors: [
                [240, 248, 255],
                [224, 236, 255],
                [190, 210, 255],
                [140, 190, 255],
                [70, 130, 180]
            ]
        },
        {
            value: '7',
            key: 'snow_depth',
            label: 'Snow depth (cm)',
            legendLabel: 'Snow depth',
            colors: [
                [252, 247, 253],
                [239, 237, 245],
                [218, 218, 235],
                [188, 189, 220],
                [158, 154, 200],
                [128, 125, 186]
            ]
        },
        {
            value: '8',
            key: 'sea_surface_temperature',
            label: 'Sea temperature (°C)',
            legendLabel: 'Sea temperature',
            colors: [
                [49, 54, 149],
                [69, 117, 180],
                [116, 173, 209],
                [171, 217, 233],
                [224, 243, 248],
                [254, 224, 144],
                [252, 141, 89],
                [215, 48, 39]
            ]
        },
        {
            value: '9',
            key: 'air_temperature',
            label: 'Air temperature (°C)',
            legendLabel: 'Air temperature',
            colors: [
                [68, 1, 84],
                [59, 82, 139],
                [33, 145, 140],
                [94, 201, 98],
                [253, 231, 37]
            ]
        }
    ];

    const WRF_WCS_TIME_STEPS = 96;

    const form = document.getElementById('search-form');
    const mapContainer = document.getElementById('map');
    const clearBboxButton = document.getElementById('clear-bbox');
    const bboxDisplay = document.getElementById('bbox-display');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const procedureInput = document.getElementById('procedures');
    const searchButton = document.getElementById('search-button');
    const statusEl = document.getElementById('status');
    const resultsSection = document.getElementById('results');
    const availabilityContainer = document.getElementById('availability-container');
    const resultsContainer = document.getElementById('results-container');
    const wrfWcsModal = document.getElementById('wrf-wcs-modal');
    const wrfWcsModalTitle = document.getElementById('wrf-wcs-modal-title');
    const wrfWcsLayerSelect = document.getElementById('wrf-wcs-layer');
    const wrfWcsTimeSelect = document.getElementById('wrf-wcs-time');
    const wrfWcsFilterMapElement = document.getElementById('wrf-wcs-filter-map');
    const wrfWcsResultMapElement = document.getElementById('wrf-wcs-result-map');
    const wrfWcsClearBboxBtn = document.getElementById('wrf-wcs-clear-bbox');
    const wrfWcsBboxDisplay = document.getElementById('wrf-wcs-bbox-display');
    const wrfWcsStatus = document.getElementById('wrf-wcs-status');
    const wrfWcsValueDisplay = document.getElementById('wrf-wcs-value-display');
    const wrfWcsLegend = document.getElementById('wrf-wcs-legend');

    if (
        !form ||
        !mapContainer ||
        !clearBboxButton ||
        !bboxDisplay ||
        !startDateInput ||
        !endDateInput ||
        !procedureInput ||
        !searchButton ||
        !statusEl ||
        !resultsSection ||
        !availabilityContainer ||
        !resultsContainer ||
        !wrfWcsModal ||
        !wrfWcsModalTitle ||
        !wrfWcsLayerSelect ||
        !wrfWcsTimeSelect ||
        !wrfWcsFilterMapElement ||
        !wrfWcsResultMapElement ||
        !wrfWcsClearBboxBtn ||
        !wrfWcsBboxDisplay ||
        !wrfWcsStatus ||
        !wrfWcsValueDisplay ||
        !wrfWcsLegend
    ) {
        Logger.error('WRF: faltan elementos requeridos en el DOM.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema')?.trim();
    const nameParam = urlParams.get('name')?.trim();
    const procedureParam = urlParams.get('procedure')?.trim();
    const startParam = urlParams.get('startDate');
    const endParam = urlParams.get('endDate');

    const schema = schemaParam && schemaParam.length > 0 ? schemaParam : DEFAULT_SCHEMA;
    const name = nameParam && nameParam.length > 0 ? nameParam : DEFAULT_NAME;

    form.dataset.schema = schema;
    form.dataset.name = name;

    if (procedureParam) {
        procedureInput.value = procedureParam;
    }
    if (startParam) {
        startDateInput.value = normalizeDateInputValue(startParam);
    }
    if (endParam) {
        endDateInput.value = normalizeDateInputValue(endParam);
    }

    if (!startDateInput.value) {
        startDateInput.value = DEFAULT_START_DATE;
    }
    if (!endDateInput.value) {
        endDateInput.value = DEFAULT_END_DATE;
    }

    let map;
    let drawnItems;
    let availabilityLayer;
    let currentBoundingBox = null;
    let availabilityFetchTimeout = null;
    let availabilityController = null;
    let wrfWcsFilterMapInstance = null;
    let wrfWcsResultMapInstance = null;
    let wrfWcsDrawnItems = null;
    let wrfWcsCurrentBbox = null;
    let wrfWcsCurrentMetadata = null;
    let wrfWcsCurrentGeoRasterLayer = null;
    let wrfWcsCurrentGeoRasterData = null;
    let wrfWcsCurrentNoDataValues = new Set();
    let wrfWcsFetchTimeout = null;

    const AVAILABILITY_DEBOUNCE_MS = 350;
    const WRF_WCS_FETCH_DEBOUNCE_MS = 400;

    initializeMap();
    updateBboxDisplay();
    scheduleAvailabilityFetch();

    clearBboxButton.addEventListener('click', () => {
        if (drawnItems) {
            drawnItems.clearLayers();
        }
        currentBoundingBox = null;
        updateBboxDisplay();
        scheduleAvailabilityFetch();
    });

    form.addEventListener('change', (event) => {
        if (event.target === searchButton) {
            return;
        }
        scheduleAvailabilityFetch();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSearch();
    });

    function normalizeDateInputValue(rawValue) {
        if (!rawValue) {
            return '';
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawValue)) {
            return rawValue;
        }
        const date = new Date(rawValue);
        if (Number.isNaN(date.getTime())) {
            return rawValue;
        }
        return date.toISOString().slice(0, 16);
    }

    function initializeMap() {
        map = L.map(mapContainer).setView([43.0, -8.0], 6);
        const initialCenter = [43.0, -8.0];
        const initialZoom = 6;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        availabilityLayer = L.layerGroup();
        map.addLayer(availabilityLayer);

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
                featureGroup: drawnItems,
                remove: true
            }
        });
        map.addControl(drawControl);
        MapManager.addResetZoomControl(map, {
            title: 'Reset Zoom',
            label: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
            labelIsHtml: true,
            getView: () => ({
                center: initialCenter,
                zoom: initialZoom
            })
        });

        map.on(L.Draw.Event.CREATED, (event) => {
            const layer = event.layer;
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);

            const bounds = layer.getBounds();
            currentBoundingBox = {
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast()
            };

            updateBboxDisplay();
            scheduleAvailabilityFetch();
        });

        map.on(L.Draw.Event.EDITED, (event) => {
            event.layers.eachLayer((layer) => {
                const bounds = layer.getBounds();
                currentBoundingBox = {
                    south: bounds.getSouth(),
                    west: bounds.getWest(),
                    north: bounds.getNorth(),
                    east: bounds.getEast()
                };
            });
            updateBboxDisplay();
            scheduleAvailabilityFetch();
        });

        map.on(L.Draw.Event.DELETED, () => {
            currentBoundingBox = null;
            updateBboxDisplay();
            scheduleAvailabilityFetch();
        });
    }

    function updateBboxDisplay() {
        if (!bboxDisplay) {
            return;
        }

        if (!currentBoundingBox) {
            bboxDisplay.innerHTML = '<em>No area selected</em>';
            bboxDisplay.classList.remove('bbox-display--active');
            return;
        }

        const { north, south, east, west } = currentBoundingBox;
        bboxDisplay.innerHTML = `
            <strong>Selected area:</strong><br>
            N: ${north.toFixed(4)}° | S: ${south.toFixed(4)}°<br>
            E: ${east.toFixed(4)}° | W: ${west.toFixed(4)}°
        `;
        bboxDisplay.classList.add('bbox-display--active');
    }

    function scheduleAvailabilityFetch(force = false) {
        if (availabilityFetchTimeout) {
            clearTimeout(availabilityFetchTimeout);
            availabilityFetchTimeout = null;
        }

        const delay = force ? 0 : AVAILABILITY_DEBOUNCE_MS;
        availabilityFetchTimeout = setTimeout(() => {
            availabilityFetchTimeout = null;
            fetchAvailability();
        }, delay);
    }

    async function fetchAvailability() {
        const procedureValue = procedureInput.value.trim();
        const startValue = startDateInput.value;
        const endValue = endDateInput.value;

        const params = new URLSearchParams({
            schema: form.dataset.schema || DEFAULT_SCHEMA,
            name: form.dataset.name || DEFAULT_NAME
        });

        if (procedureValue) {
            params.append('processIds', procedureValue);
        }

        if (startValue) {
            params.append('startTime', startValue);
        }

        if (endValue) {
            params.append('endTime', endValue);
        }

        if (currentBoundingBox) {
            params.append('spatialFilter', buildBboxEwkt(currentBoundingBox));
        }

        if (availabilityController) {
            availabilityController.abort();
        }

        availabilityController = new AbortController();
        const { signal } = availabilityController;

        setStatus('Querying availability...', 'loading');
        resultsSection.setAttribute('aria-busy', 'true');

        try {
            const json = await ApiService.fetchJson(`/api/catalog/check-availability?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json'
                },
                signal
            });
            renderAvailability(json);
            const periodCount = json?.periods?.length || 0;
            const geometryCount = json?.geometries?.features?.length || 0;
            setStatus(`Availability loaded: ${periodCount} periods, ${geometryCount} locations.`, 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            Logger.error('WRF: error fetching availability:', error);
            setStatus('Availability could not be retrieved.', 'error');
            renderAvailability(null);
        } finally {
            resultsSection.setAttribute('aria-busy', 'false');
        }
    }

    function setStatus(message, state) {
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.className = 'status';

        if (state === 'loading') {
            statusEl.classList.add('status--loading');
        } else if (state === 'success') {
            statusEl.classList.add('status--success');
        } else if (state === 'error') {
            statusEl.classList.add('status--error');
        }
    }

    function renderAvailability(data) {
        clearAvailabilityLayers();

        if (!data) {
            renderAvailabilityEmptyState('Availability data could not be loaded.');
            return;
        }

        renderGeometries(data.geometries);
        renderPeriodsSummary(data.periods);
    }

    function clearAvailabilityLayers() {
        availabilityLayer?.clearLayers();
    }

    function renderGeometries(geometries) {
        if (!geometries || !geometries.features || geometries.features.length === 0) {
            return;
        }

        const geoJsonLayer = L.geoJSON(geometries, {
            style: {
                color: '#1d4ed8',
                weight: 2.4,
                fillColor: '#2563eb',
                fillOpacity: 0.22,
                opacity: 1
            },
            pointToLayer: (feature, latlng) => {
                const count = Number(feature?.properties?.observations) || 0;
                return L.circleMarker(latlng, {
                    radius: SHARED_CONSTANTS.MARKER_BASE_RADIUS + Math.min(count, 20) * 0.3 + 1.5,
                    fillColor: '#2563eb',
                    color: '#0f172a',
                    weight: 2.4,
                    fillOpacity: 0.96,
                    opacity: 1
                });
            },
            onEachFeature: (feature, layer) => {
                if (layer.bindTooltip) {
                    layer.bindTooltip(createAvailabilityTooltip(feature), {
                        sticky: true,
                        direction: 'top',
                        opacity: 0.95,
                        className: 'availability-tooltip-container'
                    });
                }

                layer.on('mouseover', () => {
                    if (layer.openTooltip) {
                        layer.openTooltip();
                    }
                    if (layer.bringToFront) {
                        layer.bringToFront();
                    }
                });

                layer.on('mouseout', () => {
                    if (layer.closeTooltip) {
                        layer.closeTooltip();
                    }
                });
            }
        });

        geoJsonLayer.addTo(availabilityLayer);

        try {
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
        } catch (error) {
            Logger.warn('WRF: unable to fit map bounds:', error);
        }
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

    function renderPeriodsSummary(periods) {
        const availabilitySectionId = 'availability-summary';

        if (!Array.isArray(periods) || periods.length === 0) {
            renderAvailabilityEmptyState('No periods available.');
            return;
        }

        // Helper to get the end date (uses now when missing or '-')
        const getEndDate = (period) => {
            const end = period.time_extension?.[1];
            if (!end || end === '-' || end === '—') {
                return new Date(); // Momento actual
            }
            return new Date(end);
        };

        // Sort periods by start date first
        const sortedPeriods = [...periods].sort((a, b) => {
            const startA = new Date(a.time_extension?.[0] || 0).getTime();
            const startB = new Date(b.time_extension?.[0] || 0).getTime();
            return startA - startB;
        });

        // Calculate total range from the first and last sorted period
        const firstPeriod = sortedPeriods[0];
        const lastPeriod = sortedPeriods[sortedPeriods.length - 1];

        const minDate = new Date(firstPeriod.time_extension?.[0] || 0);
        const maxDate = getEndDate(lastPeriod);
        const totalRange = maxDate.getTime() - minDate.getTime() || 1;

        // Calculate maximum values to normalize bar height
        const maxObservations = Math.max(...periods.map(p => p.observations || 0));

        // SVG configuration
        const svgWidth = 800;
        const svgHeight = 180;
        const padding = { top: 20, right: 40, bottom: 50, left: 60 };
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;
        const baselineY = padding.top + chartHeight;
        const maxBarHeight = chartHeight - 20;

        // Generar barras proporcionales
        const bars = sortedPeriods.map((period, index) => {
            const start = new Date(period.time_extension?.[0]);
            const end = getEndDate(period);
            const duration = end.getTime() - start.getTime();
            const observations = period.observations || 0;

            const x = padding.left + ((start.getTime() - minDate.getTime()) / totalRange) * chartWidth;
            const width = Math.max((duration / totalRange) * chartWidth, 3);
            const height = maxObservations > 0
                ? (observations / maxObservations) * maxBarHeight
                : 5;
            const y = baselineY - height;

            const startDate = formatDateTime(period.time_extension?.[0]);
            const endValue = period.time_extension?.[1];
            const endDate = (!endValue || endValue === '-' || endValue === '—')
                ? 'En curso'
                : formatDateTime(endValue);
            const resolution = period.avg_time_resolution ?? '—';
            const durationText = formatDuration(duration);

            return `
                <rect
                    class="timeline-bar timeline-bar--animate"
                    style="animation-delay: ${index * 80}ms"
                    x="${x}"
                    y="${y}"
                    width="${width}"
                    height="${height}"
                    data-index="${index}"
                    data-start="${startDate}"
                    data-end="${endDate}"
                    data-observations="${observations.toLocaleString()}"
                    data-resolution="${resolution}"
                    data-duration="${durationText}"
                />
            `;
        }).join('');

        // Generate horizontal reference lines
        const gridLines = [];
        for (let i = 0; i <= 4; i++) {
            const y = baselineY - (i / 4) * maxBarHeight;
            const value = Math.round((i / 4) * maxObservations);
            gridLines.push(`
                <line class="timeline-grid-line" x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}" />
                <text class="timeline-y-label" x="${padding.left - 8}" y="${y + 3}">${value.toLocaleString()}</text>
            `);
        }

        const totalObservations = periods.reduce((sum, p) => sum + (p.observations || 0), 0);

        availabilityContainer.innerHTML = `
            <section id="${availabilitySectionId}" class="availability-timeline">
                <h2 class="availability-timeline__title">Data availability</h2>
                <div class="availability-timeline__content">
                    <div class="availability-timeline__chart">
                        <svg class="availability-timeline__svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#2a9d8f;stop-opacity:0.9" />
                                    <stop offset="100%" style="stop-color:#2a9d8f;stop-opacity:0.6" />
                                </linearGradient>
                            </defs>

                            ${gridLines.join('')}

                            <line class="timeline-axis" x1="${padding.left}" y1="${baselineY}" x2="${svgWidth - padding.right}" y2="${baselineY}" />

                            ${bars}

                            <text class="timeline-label timeline-label--start" x="${padding.left}" y="${svgHeight - 15}">
                                ${formatDateShort(minDate)}
                            </text>
                            <text class="timeline-label timeline-label--end" x="${svgWidth - padding.right}" y="${svgHeight - 15}">
                                ${formatDateShort(maxDate)}
                            </text>
                        </svg>

                        <div class="timeline-tooltip" id="timeline-tooltip">
                            <div class="timeline-tooltip__title">Data period</div>
                            <div class="timeline-tooltip__row">
                                <span>Start:</span>
                                <span class="timeline-tooltip__value" id="tooltip-start"></span>
                            </div>
                            <div class="timeline-tooltip__row">
                                <span>End:</span>
                                <span class="timeline-tooltip__value" id="tooltip-end"></span>
                            </div>
                            <div class="timeline-tooltip__duration" id="tooltip-duration"></div>
                            <div class="timeline-tooltip__row">
                                <span>Observations:</span>
                                <span class="timeline-tooltip__value" id="tooltip-observations"></span>
                            </div>
                            <div class="timeline-tooltip__row">
                                <span>Resolution:</span>
                                <span class="timeline-tooltip__value" id="tooltip-resolution"></span>
                            </div>
                        </div>
                    </div>

                    <div class="timeline-stats">
                        <div class="timeline-stat">
                            <span class="timeline-stat__value">${periods.length}</span>
                            <span class="timeline-stat__label">Periods</span>
                        </div>
                        <div class="timeline-stat">
                            <span class="timeline-stat__value">${totalObservations.toLocaleString()}</span>
                            <span class="timeline-stat__label">Total observations</span>
                        </div>
                    </div>
                </div>

                <div class="timeline-legend">
                    <div class="timeline-legend__item">
                        <div class="timeline-legend__bar"></div>
                        <span>Width = period duration</span>
                    </div>
                    <div class="timeline-legend__item">
                        <div class="timeline-legend__bar" style="height: 16px;"></div>
                        <span>Height = number of observations</span>
                    </div>
                </div>
            </section>
        `;

        const tooltip = document.getElementById('timeline-tooltip');
        const barElements = availabilityContainer.querySelectorAll('.timeline-bar');

        barElements.forEach(bar => {
            bar.addEventListener('mouseenter', (_event) => {
                const rect = bar.getBoundingClientRect();
                const containerRect = availabilityContainer.getBoundingClientRect();

                document.getElementById('tooltip-start').textContent = bar.dataset.start;
                document.getElementById('tooltip-end').textContent = bar.dataset.end;
                document.getElementById('tooltip-duration').textContent = `Duration: ${bar.dataset.duration}`;
                document.getElementById('tooltip-observations').textContent = bar.dataset.observations;
                document.getElementById('tooltip-resolution').textContent = bar.dataset.resolution;

                const tooltipX = rect.left - containerRect.left + rect.width / 2 - 120;
                const tooltipY = rect.top - containerRect.top - 140;

                tooltip.style.left = `${Math.max(0, Math.min(tooltipX, containerRect.width - 240))}px`;
                tooltip.style.top = `${Math.max(0, tooltipY)}px`;
                tooltip.classList.add('timeline-tooltip--visible');
            });

            bar.addEventListener('mouseleave', () => {
                tooltip.classList.remove('timeline-tooltip--visible');
            });
        });
    }

    function formatDuration(durationMs) {
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
        if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }

    function formatDateShort(date) {
        if (!date) return '—';
        try {
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
        } catch {
            return '—';
        }
    }

    function formatDateTime(value) {
        if (!value) {
            return '—';
        }
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return value;
            }
            return date.toISOString().replace('T', ' ').slice(0, 19);
        } catch (error) {
            return value;
        }
    }

    async function handleSearch() {
        const formData = new FormData(form);
        const procedureValue = (formData.get('procedures') || '').trim();
        const startValue = formData.get('start-date');
        const endValue = formData.get('end-date');

        if (!procedureValue) {
            setStatus('Please enter a procedure.', 'error');
            return;
        }

        if (!startValue || !endValue) {
            setStatus('Please select start and end dates.', 'error');
            return;
        }

        setStatus('Querying WRF data...', 'loading');
        renderResultsEmptyState('Preparing results...');
        searchButton.disabled = true;

        try {
            const wfsUrl = WfsClient.buildUrl('ccmm:observation_modelo_wrf_wfs', {
                bbox: currentBoundingBox,
                startDate: startValue,
                endDate: endValue,
                procedures: procedureValue
            });

            const json = await WfsClient.fetchData(wfsUrl);

            if (!json || !Array.isArray(json.features) || json.features.length === 0) {
                renderResultsEmptyState('No WRF data was found for the selected criteria.');
                setStatus('No results.', 'info');
                return;
            }

            renderResults(json);
            setStatus(`Found ${json.features.length} WRF observations.`, 'success');
        } catch (error) {
            Logger.error('WRF: error al consultar datos WFS:', error);
            const detailMessage = error?.details ? `<br><small>${sanitize(String(error.details))}</small>` : '';
            renderResultsEmptyState(`Unable to retrieve data. Please try again later.${detailMessage}`);
            setStatus('Error querying WRF data.', 'error');
        } finally {
            searchButton.disabled = false;
        }
    }

    function renderResults(featureCollection) {
        resultsContainer.innerHTML = '';

        let { features = [] } = featureCollection;

        // Sort by process (ascending), then by date (ascending)
        features = features.slice().sort((a, b) => {
            const procA = String(a?.properties?.procedure ?? '').toLowerCase();
            const procB = String(b?.properties?.procedure ?? '').toLowerCase();

            if (procA !== procB) {
                return procA.localeCompare(procB);
            }

            const dateA = new Date(a?.properties?.result_time ?? 0);
            const dateB = new Date(b?.properties?.result_time ?? 0);
            return dateA - dateB;
        });

        const summary = document.createElement('div');
        summary.className = 'results-summary';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'results-summary__header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = 'Query results';

        const exportBtn = CsvExporter.createButton(() => {
            CsvExporter.exportFeatures(features, 'wrf-observations', {
                fieldOrder: ['procedure', 'result_time', 'feature_of_interest'],
                fieldLabels: {
                    procedure: 'Process',
                    result_time: 'Date',
                    feature_of_interest: 'FeatureOfInterest'
                }
            });
        });

        headerDiv.appendChild(titleEl);
        headerDiv.appendChild(exportBtn);
        summary.appendChild(headerDiv);

        const subtitleEl = document.createElement('p');
        subtitleEl.innerHTML = `Found <strong>${features.length}</strong> WRF observations`;
        summary.appendChild(subtitleEl);

        resultsContainer.appendChild(summary);

        const list = document.createElement('div');
        list.className = 'ctd-feature-list ctd-feature-list--grid wrf-feature-list--grid';

        const headerRow = createRow(['Process', 'Date', 'View chart'], true);
        list.appendChild(headerRow);

        features.forEach((feature) => {
            const procedure = formatValue(feature?.properties?.procedure);
            const date = formatDateTime(feature?.properties?.result_time);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ctd-grid-row__action';
            button.textContent = 'View chart';
            button.addEventListener('click', () => {
                const raw = feature?.properties?.temporal_spatial_subsamples;
                if (!raw) {
                    alert('No WCS data is available for this WRF observation.');
                    return;
                }

                try {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const coverageName = parsed?.coverage_name;
                    if (!coverageName) {
                        alert('WCS coverage is not available for this observation.');
                        return;
                    }

                    openWrwWcsModal({
                        coverageName,
                        wcsUrl: parsed?.wcs_url || '/api/geoserver/wcs',
                        resultTime: feature?.properties?.result_time
                    });
                } catch (parseError) {
                    Logger.error('WRF: error parsing temporal_spatial_subsamples:', parseError);
                    alert('Error loading WCS data. Please try again.');
                }
            });

            list.appendChild(createRow([procedure, date, button]));
        });

        resultsContainer.appendChild(list);
    }

    function createRow(cells, isHeader = false) {
        const row = document.createElement('div');
        row.className = `ctd-grid-row wrf-grid-row${isHeader ? ' ctd-grid-row--header' : ''}`;

        cells.forEach((cellValue, index) => {
            const cell = document.createElement('span');
            const baseClass = isHeader ? 'ctd-grid-row__cell ctd-grid-row__cell--header' : 'ctd-grid-row__cell';
            const actionClass = !isHeader && index === cells.length - 1 ? ' ctd-grid-row__cell--actions' : '';
            cell.className = `${baseClass}${actionClass}`;

            if (cellValue instanceof HTMLElement) {
                cell.appendChild(cellValue);
            } else {
                cell.textContent = cellValue;
            }

            row.appendChild(cell);
        });

        return row;
    }

    function renderResultsEmptyState(message) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        resultsContainer.replaceChildren(emptyState);
    }

    function renderAvailabilityEmptyState(message) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        availabilityContainer.replaceChildren(emptyState);
    }

    function openWrwWcsModal(metadata) {
        wrfWcsCurrentMetadata = metadata;

        wrfWcsModalTitle.textContent = `WRF visualization - ${metadata.coverageName}`;

        WcsUi.populateLayerOptions(wrfWcsLayerSelect, WRF_WCS_LAYER_OPTIONS);
        WcsUi.populateTimeOptions(wrfWcsTimeSelect, metadata.resultTime, WRF_WCS_TIME_STEPS);
        resetWrwWcsState();
        initializeWrwWcsMaps();

        wrfWcsModal.hidden = false;
        document.body.classList.add('modal-open');

        setTimeout(() => {
            wrfWcsFilterMapInstance?.invalidateSize();
            wrfWcsResultMapInstance?.invalidateSize();
            scheduleWrwWcsFetch(true);
        }, 120);
    }

    function resetWrwWcsState() {
        wrfWcsCurrentBbox = null;
        wrfWcsCurrentGeoRasterData = null;
        wrfWcsCurrentGeoRasterLayer = null;
        wrfWcsCurrentNoDataValues = new Set();
        updateWrwWcsBboxDisplay();
        updateWrwWcsValueDisplay(null);
        updateWrwWcsLegend(null);
        setWrwWcsStatus('Select filters to load the visualization.', 'info');

        if (wrfWcsDrawnItems) {
            wrfWcsDrawnItems.clearLayers();
        }
    }

    function initializeWrwWcsMaps() {
        const filterMapState = WcsUi.initializeFilterMap({
            mapInstance: wrfWcsFilterMapInstance,
            mapElement: wrfWcsFilterMapElement,
            drawnItems: wrfWcsDrawnItems,
            onBboxChange: (bbox) => {
                wrfWcsCurrentBbox = bbox;
                updateWrwWcsBboxDisplay();
                scheduleWrwWcsFetch();
            }
        });

        wrfWcsFilterMapInstance = filterMapState.mapInstance;
        wrfWcsDrawnItems = filterMapState.drawnItems;

        const resultMapState = WcsUi.initializeResultMap({
            mapInstance: wrfWcsResultMapInstance,
            mapElement: wrfWcsResultMapElement,
            onHover: (lat, lng) => {
                handleWrwWcsResultMapHover(lat, lng);
            },
            onMouseOut: () => {
                updateWrwWcsValueDisplay(null);
            }
        });

        wrfWcsResultMapInstance = resultMapState.mapInstance;
    }

    function scheduleWrwWcsFetch(force = false) {
        if (wrfWcsFetchTimeout) {
            clearTimeout(wrfWcsFetchTimeout);
        }

        const delay = force ? 0 : WRF_WCS_FETCH_DEBOUNCE_MS;
        wrfWcsFetchTimeout = setTimeout(() => {
            wrfWcsFetchTimeout = null;
            fetchWrwWcsData();
        }, delay);
    }

    async function fetchWrwWcsData() {
        if (!wrfWcsCurrentMetadata?.coverageName) {
            return;
        }

        const { coverageName } = wrfWcsCurrentMetadata;
        const baseDate = extractDateFromCoverageName(coverageName);
        if (!baseDate) {
            setWrwWcsStatus('The coverage date could not be determined.', 'error');
            return;
        }

        const offset = Number.parseInt(wrfWcsTimeSelect.value, 10) || 0;
        baseDate.setUTCHours(baseDate.getUTCHours() + offset);
        const timeIso = baseDate.toISOString();

        const params = new URLSearchParams({
            service: 'WCS',
            version: '2.0.1',
            request: 'GetCoverage',
            coverageId: coverageName,
            rangesubset: `Band${wrfWcsLayerSelect.value || '1'}`
        });

        params.append('subset', `time("${timeIso}")`);

        if (wrfWcsCurrentBbox) {
            params.append('subset', `Long(${wrfWcsCurrentBbox.west},${wrfWcsCurrentBbox.east})`);
            params.append('subset', `Lat(${wrfWcsCurrentBbox.south},${wrfWcsCurrentBbox.north})`);
        }

        try {
            setWrwWcsStatus('Loading WRF data...', 'loading');
            updateWrwWcsValueDisplay(null);
            wrfWcsCurrentGeoRasterData = null;
            wrfWcsCurrentNoDataValues = new Set();

            const blob = await ApiService.fetchWCSLayer(coverageName, {
                bbox: wrfWcsCurrentBbox
                    ? `${wrfWcsCurrentBbox.west},${wrfWcsCurrentBbox.south},${wrfWcsCurrentBbox.east},${wrfWcsCurrentBbox.north}`
                    : null,
                time: timeIso
            });
            const arrayBuffer = await blob.arrayBuffer();
            const georaster = await parseGeoraster(arrayBuffer);
            wrfWcsCurrentGeoRasterData = georaster;

            if (wrfWcsCurrentGeoRasterLayer && wrfWcsResultMapInstance) {
                wrfWcsResultMapInstance.removeLayer(wrfWcsCurrentGeoRasterLayer);
            }

            wrfWcsCurrentNoDataValues = extractNoDataValues(georaster);
            const valueRange = computeGeoRasterValueRange(georaster, wrfWcsCurrentNoDataValues);
            const colorScale = buildWrwColorScale(wrfWcsLayerSelect.value, wrfWcsCurrentNoDataValues, valueRange);

            wrfWcsCurrentGeoRasterLayer = new GeoRasterLayer({
                georaster,
                opacity: 0.75,
                pixelValuesToColorFn: colorScale.colorFn,
                resolution: 256
            });
            wrfWcsCurrentGeoRasterLayer.addTo(wrfWcsResultMapInstance);

            const bounds = [
                [georaster.ymin, georaster.xmin],
                [georaster.ymax, georaster.xmax]
            ];
            wrfWcsResultMapInstance.fitBounds(bounds);

            updateWrwWcsLegend(colorScale);
            setWrwWcsStatus('Data loaded successfully.', 'success');
        } catch (error) {
            Logger.error('WRF WCS error:', error);
            setWrwWcsStatus('Error loading WCS data.', 'error');
            updateWrwWcsValueDisplay(null);
            wrfWcsCurrentGeoRasterData = null;
            if (wrfWcsCurrentGeoRasterLayer && wrfWcsResultMapInstance) {
                wrfWcsResultMapInstance.removeLayer(wrfWcsCurrentGeoRasterLayer);
                wrfWcsCurrentGeoRasterLayer = null;
            }
        }
    }

    function extractDateFromCoverageName(coverageName) {
        const match = coverageName?.match(/(\d{8})$/);
        if (!match) {
            return null;
        }

        const [, dateStr] = match;
        const year = Number.parseInt(dateStr.slice(0, 4), 10);
        const month = Number.parseInt(dateStr.slice(4, 6), 10);
        const day = Number.parseInt(dateStr.slice(6, 8), 10);

        if ([year, month, day].some((value) => Number.isNaN(value))) {
            return null;
        }

        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    }

    function handleWrwWcsResultMapHover(lat, lng) {
        if (!wrfWcsCurrentGeoRasterData) {
            return;
        }

        const value = WcsRaster.getValueAtLatLng(wrfWcsCurrentGeoRasterData, lat, lng, wrfWcsCurrentNoDataValues);
        updateWrwWcsValueDisplay(value);
    }

    function updateWrwWcsBboxDisplay() {
        if (!wrfWcsBboxDisplay) {
            return;
        }

        if (!wrfWcsCurrentBbox) {
            wrfWcsBboxDisplay.innerHTML = '<em>Draw a rectangle on the map</em>';
            wrfWcsBboxDisplay.classList.remove('wcs-bbox-display--active');
            return;
        }

        const { north, south, east, west } = wrfWcsCurrentBbox;
        wrfWcsBboxDisplay.innerHTML = `
            <strong>BBOX:</strong><br>
            N: ${north.toFixed(4)}° | S: ${south.toFixed(4)}°<br>
            E: ${east.toFixed(4)}° | W: ${west.toFixed(4)}°
        `;
        wrfWcsBboxDisplay.classList.add('wcs-bbox-display--active');
    }

    function updateWrwWcsValueDisplay(value) {
        if (!wrfWcsValueDisplay) {
            return;
        }

        const formatted = formatWrwPixelValue(value);
        wrfWcsValueDisplay.textContent = `Value: ${formatted}`;
    }

    function formatWrwPixelValue(value) {
        if (value === null || value === undefined) {
            return '—';
        }

        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < -999 || wrfWcsCurrentNoDataValues.has(numeric)) {
            return '—';
        }

        return Number.parseFloat(numeric.toFixed(3)).toString();
    }

    function buildWrwColorScale(layerValue, noDataValues, valueRange) {
        const selectedOption = WRF_WCS_LAYER_OPTIONS.find((option) => option.value === String(layerValue)) || WRF_WCS_LAYER_OPTIONS[0];
        const colors = selectedOption.colors;

        let minValue = Number.isFinite(valueRange?.min) ? valueRange.min : 0;
        let maxValue = Number.isFinite(valueRange?.max) ? valueRange.max : minValue + 1;

        if (!Number.isFinite(maxValue) || maxValue <= minValue) {
            maxValue = minValue + 1;
        }

        const denominator = Math.max(1e-9, maxValue - minValue);

        return {
            label: selectedOption.legendLabel,
            colors,
            minValue,
            maxValue,
            colorFn: (values) => {
                const value = values?.[0];
                const numeric = Number(value);

                if (!Number.isFinite(numeric) || numeric < -999 || noDataValues.has(numeric)) {
                    return 'rgba(0, 0, 0, 0)';
                }

                const normalized = Math.max(0, Math.min(1, (numeric - minValue) / denominator));
                const scaled = normalized * (colors.length - 1);
                const lowerIndex = Math.floor(scaled);
                const upperIndex = Math.min(colors.length - 1, lowerIndex + 1);
                const fraction = scaled - lowerIndex;

                const lowerColor = colors[lowerIndex];
                const upperColor = colors[upperIndex];

                const r = Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * fraction);
                const g = Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * fraction);
                const b = Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * fraction);

                return `rgba(${r}, ${g}, ${b}, 0.8)`;
            }
        };
    }

    function updateWrwWcsLegend(colorScale) {
        if (!wrfWcsLegend) {
            return;
        }

        if (!colorScale) {
            wrfWcsLegend.innerHTML = '';
            return;
        }

        const gradientStops = colorScale.colors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ');

        wrfWcsLegend.innerHTML = `
            <div class="wcs-legend__title">${colorScale.label}</div>
            <div class="wcs-legend__gradient" style="background: linear-gradient(to right, ${gradientStops});"></div>
            <div class="wcs-legend__labels">
                <span>${Number.isFinite(colorScale.minValue) ? colorScale.minValue.toFixed(2) : '—'}</span>
                <span>${Number.isFinite(colorScale.maxValue) ? colorScale.maxValue.toFixed(2) : '—'}</span>
            </div>
        `;
    }

    function setWrwWcsStatus(message, type) {
        if (!wrfWcsStatus) {
            return;
        }

        wrfWcsStatus.textContent = message;
        wrfWcsStatus.className = `wcs-status wcs-status--${type}`;
    }

    function extractNoDataValues(georaster) {
        const values = new Set();
        if (!georaster) {
            return values;
        }

        const addValue = (value) => {
            if (value === null || value === undefined) {
                return;
            }
            const numeric = Number(value);
            if (!Number.isNaN(numeric)) {
                values.add(numeric);
            }
        };

        if (Array.isArray(georaster.noDataValues)) {
            georaster.noDataValues.forEach(addValue);
        }

        addValue(georaster.noDataValue);

        if (Array.isArray(georaster.bands)) {
            georaster.bands.forEach((band) => {
                if (Array.isArray(band?.noDataValues)) {
                    band.noDataValues.forEach(addValue);
                }
                addValue(band?.noDataValue);
            });
        }

        return values;
    }

    function computeGeoRasterValueRange(georaster, noDataValues = new Set()) {
        let minValue = Infinity;
        let maxValue = -Infinity;

        iterateFirstBandValues(georaster, (value) => {
            if (!Number.isFinite(value)) {
                return;
            }
            if (value < -999 || noDataValues.has(value)) {
                return;
            }
            if (value < minValue) {
                minValue = value;
            }
            if (value > maxValue) {
                maxValue = value;
            }
        });

        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
            return { min: NaN, max: NaN };
        }

        return { min: minValue, max: maxValue };
    }

    function iterateFirstBandValues(georaster, callback) {
        if (!georaster || typeof callback !== 'function') {
            return;
        }

        const firstBand = georaster?.values?.[0];
        if (!firstBand) {
            return;
        }

        if (Array.isArray(firstBand)) {
            firstBand.forEach((row) => {
                if (Array.isArray(row) || ArrayBuffer.isView(row)) {
                    for (let i = 0; i < row.length; i++) {
                        callback(row[i]);
                    }
                } else if (typeof row === 'number') {
                    callback(row);
                }
            });
        } else if (ArrayBuffer.isView(firstBand)) {
            for (let i = 0; i < firstBand.length; i++) {
                callback(firstBand[i]);
            }
        }
    }

    wrfWcsLayerSelect.addEventListener('change', () => scheduleWrwWcsFetch());
    wrfWcsTimeSelect.addEventListener('change', () => scheduleWrwWcsFetch());

    wrfWcsClearBboxBtn.addEventListener('click', () => {
        if (wrfWcsDrawnItems) {
            wrfWcsDrawnItems.clearLayers();
        }
        wrfWcsCurrentBbox = null;
        updateWrwWcsBboxDisplay();
        scheduleWrwWcsFetch();
    });

    wrfWcsModal.addEventListener('click', (event) => {
        if (event.target?.dataset?.modalDismiss !== undefined) {
            closeWrwWcsModal();
        }
    });

    wrfWcsModal.querySelectorAll('[data-modal-dismiss]').forEach((element) => {
        element.addEventListener('click', closeWrwWcsModal);
    });

    function closeWrwWcsModal() {
        wrfWcsModal.hidden = true;
        document.body.classList.remove('modal-open');

        if (wrfWcsCurrentGeoRasterLayer && wrfWcsResultMapInstance) {
            wrfWcsResultMapInstance.removeLayer(wrfWcsCurrentGeoRasterLayer);
            wrfWcsCurrentGeoRasterLayer = null;
        }

        wrfWcsCurrentGeoRasterData = null;
        wrfWcsCurrentNoDataValues = new Set();
        updateWrwWcsValueDisplay(null);
        updateWrwWcsLegend(null);
        wrfWcsCurrentMetadata = null;
    }
})();

