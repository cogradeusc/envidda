'use strict';

(function () {
    const DEFAULT_SCHEMA = 'roms_meteogalicia';
    const DEFAULT_NAME = 'modelo_roms';
    const DEFAULT_START_DATE = '2000-01-01T00:00';
    const DEFAULT_END_DATE = '2050-01-01T00:00';

    // ROMS-specific layer options (GeoServer band names)
    const ROMS_WCS_LAYER_OPTIONS = [
        {
            value: 'Band1',
            label: 'Salinity (psu)',
            legendLabel: 'Salinity',
            colors: [
                [255, 247, 236],
                [254, 232, 200],
                [253, 212, 158],
                [253, 187, 132],
                [252, 152, 93],
                [227, 100, 69],
                [189, 50, 38],
                [128, 0, 38]
            ]
        },
        {
            value: 'Band2',
            label: 'Potential temperature (°C)',
            legendLabel: 'Temperature',
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
            value: 'Band3',
            label: 'U velocity (m/s)',
            legendLabel: 'U velocity',
            colors: [
                [103, 0, 31],
                [178, 24, 43],
                [214, 96, 77],
                [244, 165, 130],
                [253, 219, 199],
                [209, 229, 240],
                [146, 197, 222],
                [67, 147, 195],
                [33, 102, 172],
                [5, 48, 97]
            ]
        },
        {
            value: 'Band4',
            label: 'V velocity (m/s)',
            legendLabel: 'V velocity',
            colors: [
                [103, 0, 31],
                [178, 24, 43],
                [214, 96, 77],
                [244, 165, 130],
                [253, 219, 199],
                [209, 229, 240],
                [146, 197, 222],
                [67, 147, 195],
                [33, 102, 172],
                [5, 48, 97]
            ]
        },
        {
            value: 'Band5',
            label: 'Free surface height (m)',
            legendLabel: 'Surface height',
            colors: [
                [140, 81, 10],
                [191, 129, 45],
                [223, 194, 125],
                [246, 232, 195],
                [199, 234, 229],
                [128, 205, 193],
                [53, 151, 143],
                [1, 102, 94]
            ]
        }
    ];

    // ROMS depth levels (elevation axis values)
    const ROMS_DEPTH_LEVELS = [
        { value: '0', label: '0m (surface)' },
        { value: '10', label: '10m' },
        { value: '20', label: '20m' },
        { value: '35', label: '35m' },
        { value: '75', label: '75m' },
        { value: '125', label: '125m' },
        { value: '150', label: '150m' },
        { value: '250', label: '250m' },
        { value: '400', label: '400m' },
        { value: '500', label: '500m' },
        { value: '1000', label: '1000m' },
        { value: '1500', label: '1500m' },
        { value: '2000', label: '2000m' },
        { value: '3000', label: '3000m' },
        { value: '4000', label: '4000m' }
    ];

    const ROMS_WCS_TIME_STEPS = 96;

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
    const pageTitle = document.getElementById('page-title');
    const backLink = document.getElementById('back-link');
    const availabilityContainer = document.getElementById('availability-container');
    const resultsContainer = document.getElementById('results-container');
    const romsWcsModal = document.getElementById('roms-wcs-modal');
    const romsWcsModalTitle = document.getElementById('roms-wcs-modal-title');
    const romsWcsLayerSelect = document.getElementById('roms-wcs-layer');
    const romsWcsTimeSelect = document.getElementById('roms-wcs-time');
    const romsWcsDepthSelect = document.getElementById('roms-wcs-depth');
    const romsWcsFilterMapElement = document.getElementById('roms-wcs-filter-map');
    const romsWcsResultMapElement = document.getElementById('roms-wcs-result-map');
    const romsWcsClearBboxBtn = document.getElementById('roms-wcs-clear-bbox');
    const romsWcsBboxDisplay = document.getElementById('roms-wcs-bbox-display');
    const romsWcsStatus = document.getElementById('roms-wcs-status');
    const romsWcsValueDisplay = document.getElementById('roms-wcs-value-display');
    const romsWcsLegend = document.getElementById('roms-wcs-legend');

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
        !romsWcsModal ||
        !romsWcsModalTitle ||
        !romsWcsLayerSelect ||
        !romsWcsTimeSelect ||
        !romsWcsDepthSelect ||
        !romsWcsFilterMapElement ||
        !romsWcsResultMapElement ||
        !romsWcsClearBboxBtn ||
        !romsWcsBboxDisplay ||
        !romsWcsStatus ||
        !romsWcsValueDisplay ||
        !romsWcsLegend
    ) {
        Logger.error('ROMS: required DOM elements are missing.');
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

    if (backLink) {
        backLink.href = `process-type.html?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}`;
    }

    if (pageTitle) {
        pageTitle.textContent = 'ROMS data query';
    }
    document.title = 'Lendas - ROMS data query';

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
    let romsWcsFilterMapInstance = null;
    let romsWcsResultMapInstance = null;
    let romsWcsDrawnItems = null;
    let romsWcsCurrentBbox = null;
    let romsWcsCurrentMetadata = null;
    let romsWcsCurrentGeoRasterLayer = null;
    let romsWcsCurrentGeoRasterData = null;
    let romsWcsCurrentNoDataValues = new Set();
    let romsWcsFetchTimeout = null;

    const AVAILABILITY_DEBOUNCE_MS = 350;
    const ROMS_WCS_FETCH_DEBOUNCE_MS = 400;

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

        if (!startValue || !endValue) {
            return;
        }

        if (new Date(startValue) > new Date(endValue)) {
            setStatus('Invalid time range for availability.', 'error');
            return;
        }

        if (!procedureValue && !currentBoundingBox) {
            clearAvailabilityLayers();
            AvailabilityRenderer.renderPeriodsSummary(availabilityContainer, []);
            setStatus('For availability, enter processes or draw a BBOX.', 'info');
            return;
        }

        if (availabilityController) {
            availabilityController.abort();
        }

        availabilityController = new AbortController();
        const { signal } = availabilityController;

        setStatus('Querying availability...', 'loading');
        resultsSection.setAttribute('aria-busy', 'true');

        try {
            const json = await WfsClient.fetchAvailability(
                {
                    schema: form.dataset.schema || DEFAULT_SCHEMA,
                    name: form.dataset.name || DEFAULT_NAME,
                    procedures: procedureValue,
                    startTime: formatDateTimeForRequest(startValue),
                    endTime: formatDateTimeForRequest(endValue),
                    bbox: currentBoundingBox
                },
                signal
            );

            renderAvailability(json);
            const periodCount = json?.periods?.length || 0;
            const geometryCount = json?.geometries?.features?.length || 0;
            setStatus(`Availability loaded: ${periodCount} periods, ${geometryCount} locations.`, 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            Logger.error('ROMS: error fetching availability:', error);
            setStatus('Availability could not be retrieved.', 'error');
            renderAvailability(null);
        } finally {
            resultsSection.setAttribute('aria-busy', 'false');
            availabilityController = null;
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
        availabilityContainer.innerHTML = '';

        if (!data) {
            AvailabilityRenderer.renderPeriodsSummary(availabilityContainer, []);
            return;
        }

        MapManager.renderGeometries(map, availabilityLayer, data.geometries, {
            styleFactory: () => ({
                color: '#1d4ed8',
                weight: 2.4,
                fillColor: '#2563eb',
                fillOpacity: 0.22,
                opacity: 1
            }),
            pointStyleFactory: (feature) => {
                const count = Number(feature?.properties?.observations) || 0;
                return {
                    radius: SHARED_CONSTANTS.MARKER_BASE_RADIUS + Math.min(count, 20) * 0.3 + 1.5,
                    fillColor: '#2563eb',
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
        AvailabilityRenderer.renderPeriodsSummary(availabilityContainer, data.periods);
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

    function clearAvailabilityLayers() {
        availabilityLayer?.clearLayers();
    }

    function renderGeometries(geometries) {
        if (!geometries || !geometries.features || geometries.features.length === 0) {
            return;
        }

        const geoJsonLayer = L.geoJSON(geometries, {
            style: {
                color: '#2563eb',
                weight: 2,
                fillOpacity: 0.2
            }
        });

        geoJsonLayer.addTo(availabilityLayer);

        try {
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
        } catch (error) {
            Logger.warn('ROMS: unable to fit map bounds:', error);
        }
    }

    function renderPeriodsSummary(periods) {
        const availabilitySectionId = 'availability-summary';

        if (!Array.isArray(periods) || periods.length === 0) {
            renderAvailabilityEmptyState('No periods available.');
            return;
        }

        // Sort periods by start date first
        const sortedPeriods = [...periods].sort((a, b) => {
            const startA = new Date(a.time_extension?.[0] || 0).getTime();
            const startB = new Date(b.time_extension?.[0] || 0).getTime();
            return startA - startB;
        });

        // Helper to get the end date (uses now when missing or '-')
        const getEndDate = (period) => {
            const end = period.time_extension?.[1];
            if (!end || end === '-' || end === '—') {
                return new Date(); // Momento actual
            }
            return new Date(end);
        };

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

            // X position proportional to start time
            const x = padding.left + ((start.getTime() - minDate.getTime()) / totalRange) * chartWidth;

            // Width proportional to period duration
            const width = Math.max((duration / totalRange) * chartWidth, 3); // Minimum 3px for visibility

            // Height proportional to observations
            const height = maxObservations > 0
                ? (observations / maxObservations) * maxBarHeight
                : 5; // Minimum height when there are no observations

            const y = baselineY - height;

            // Format dates for the tooltip (show 'Ongoing' when there is no end date)
            const startDate = formatDateTime(period.time_extension?.[0]);
            const endValue = period.time_extension?.[1];
            const endDate = (!endValue || endValue === '-' || endValue === '—')
                ? 'Ongoing'
                : formatDateTime(endValue);
            const resolution = period.avg_time_resolution ?? '—';

            // Calculate readable duration
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

        // Generate horizontal reference lines (grid)
        const gridLines = [];
        for (let i = 0; i <= 4; i++) {
            const y = baselineY - (i / 4) * maxBarHeight;
            const value = Math.round((i / 4) * maxObservations);
            gridLines.push(`
                <line class="timeline-grid-line" x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}" />
                <text class="timeline-y-label" x="${padding.left - 8}" y="${y + 3}">${value.toLocaleString()}</text>
            `);
        }

        // Calculate statistics
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

                            <!-- Horizontal reference lines -->
                            ${gridLines.join('')}

                            <!-- Eje X -->
                            <line class="timeline-axis" x1="${padding.left}" y1="${baselineY}" x2="${svgWidth - padding.right}" y2="${baselineY}" />

                            <!-- Period bars -->
                            ${bars}

                            <!-- Date labels on the X axis -->
                            <text class="timeline-label timeline-label--start" x="${padding.left}" y="${svgHeight - 15}">
                                ${formatDateShort(minDate)}
                            </text>
                            <text class="timeline-label timeline-label--end" x="${svgWidth - padding.right}" y="${svgHeight - 15}">
                                ${formatDateShort(maxDate)}
                            </text>
                        </svg>

                        <!-- Tooltip -->
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

                    <!-- Stats on the right -->
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

                <!-- Leyenda debajo -->
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

        // Add tooltip event listeners
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

                // Posicionar tooltip centrado sobre la barra
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
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            });
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

        if (!startValue || !endValue) {
            setStatus('Please select start and end dates.', 'error');
            return;
        }

        if (new Date(startValue) > new Date(endValue)) {
            setStatus('The start date cannot be later than the end date.', 'error');
            return;
        }

        if (!procedureValue && !currentBoundingBox) {
            setStatus('Enter at least one process or select a BBOX to limit the search.', 'error');
            return;
        }

        setStatus('Querying ROMS data...', 'loading');
        renderResultsEmptyState('Preparing results...');
        resultsSection.setAttribute('aria-busy', 'true');
        searchButton.disabled = true;

        try {
            const wfsUrl = WfsClient.buildUrl('ccmm:observation_modelo_roms_wfs', {
                bbox: currentBoundingBox,
                startDate: startValue,
                endDate: endValue,
                procedures: procedureValue
            });
            const json = await WfsClient.fetchData(wfsUrl);

            if (!json || !Array.isArray(json.features) || json.features.length === 0) {
                renderResultsEmptyState('No ROMS data was found for the selected criteria.');
                setStatus('No results.', 'info');
                return;
            }

            renderResults(json);
            setStatus(`Found ${json.features.length} ROMS observations.`, 'success');
            scheduleAvailabilityFetch();
        } catch (error) {
            Logger.error('ROMS: error querying WFS data:', error);
            const detailMessage = error?.details ? `<br><small>${sanitize(String(error.details))}</small>` : '';
            renderResultsEmptyState(`Unable to retrieve data. Please try again later.${detailMessage}`);
            setStatus('Error querying ROMS data.', 'error');
        } finally {
            searchButton.disabled = false;
            resultsSection.setAttribute('aria-busy', 'false');
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
            CsvExporter.exportFeatures(features, 'roms-observations', {
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
        subtitleEl.innerHTML = `Found <strong>${features.length}</strong> ROMS observations`;
        summary.appendChild(subtitleEl);

        resultsContainer.appendChild(summary);

        const list = document.createElement('div');
        list.className = 'ctd-feature-list ctd-feature-list--grid roms-feature-list--grid';

        const headerRow = createRow(['Process', 'Date', 'Visualization'], true);
        list.appendChild(headerRow);

        features.forEach((feature) => {
            const procedure = formatValue(feature?.properties?.procedure);
            const date = formatDateTime(feature?.properties?.result_time);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ctd-grid-row__action';
            button.textContent = 'View chart';
            button.addEventListener('click', () => {
                const raw = feature?.properties?.temporal_spatial_vertical_subsamples;
                if (!raw) {
                    notifications.warning('No WCS data is available for this ROMS observation.');
                    return;
                }

                try {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const coverageName = parsed?.coverage_name;
                    if (!coverageName) {
                        notifications.warning('WCS coverage is not available for this observation.');
                        return;
                    }

                    openRomsWcsModal({
                        coverageName,
                        wcsUrl: parsed?.wcs_url || '/api/geoserver/wcs',
                        resultTime: feature?.properties?.result_time
                    });
                } catch (parseError) {
                    Logger.error('ROMS: error parsing temporal_spatial_vertical_subsamples:', parseError);
                    notifications.error('Error loading WCS data. Please try again.');
                }
            });

            list.appendChild(createRow([procedure, date, button]));
        });

        resultsContainer.appendChild(list);
    }

    function createRow(cells, isHeader = false) {
        const row = document.createElement('div');
        row.className = `ctd-grid-row roms-grid-row${isHeader ? ' ctd-grid-row--header' : ''}`;

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

    function buildWfsUrl(formData) {
        const baseUrl = '/api/geoserver/wfs';
        const params = new URLSearchParams({
            typeName: 'ccmm:observation_modelo_roms_wfs'
        });

        const filters = [];

        const bboxBounds = currentBoundingBox;
        if (bboxBounds) {
            const { west, south, east, north } = bboxBounds;
            filters.push(`BBOX(shape,${west},${south},${east},${north})`);
        }

        const start = formData.get('start-date');
        if (start) {
            filters.push(`result_time>='${new Date(start).toISOString()}'`);
        }

        const end = formData.get('end-date');
        if (end) {
            filters.push(`result_time<='${new Date(end).toISOString()}'`);
        }

        const procedure = (formData.get('procedure') || '').trim();
        if (procedure) {
            filters.push(`procedure=${procedure}`);
        }

        if (filters.length > 0) {
            params.append('cql_filter', filters.join(' AND '));
        }

        return `${baseUrl}?${params.toString()}`;
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

    function extractErrorDetail(rawText) {
        if (!rawText) {
            return null;
        }

        const trimmed = rawText.trim();

        if (trimmed.startsWith('<')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(trimmed, 'application/xml');
                const exceptionText = doc.querySelector('ExceptionText');
                if (exceptionText && exceptionText.textContent) {
                    return exceptionText.textContent;
                }
                return doc.documentElement.textContent;
            } catch (error) {
                return trimmed;
            }
        }

        return trimmed;
    }

    // ==================== WCS MODAL FUNCTIONS ====================

    function openRomsWcsModal(metadata) {
        romsWcsCurrentMetadata = metadata;

        romsWcsModalTitle.textContent = `ROMS visualization - ${metadata.coverageName}`;

        WcsUi.populateLayerOptions(romsWcsLayerSelect, ROMS_WCS_LAYER_OPTIONS);
        WcsUi.populateTimeOptions(romsWcsTimeSelect, metadata.resultTime, ROMS_WCS_TIME_STEPS);
        populateRomsWcsDepthOptions();
        resetRomsWcsState();
        initializeRomsWcsMaps();

        romsWcsModal.hidden = false;
        document.body.classList.add('modal-open');

        setTimeout(() => {
            romsWcsFilterMapInstance?.invalidateSize();
            romsWcsResultMapInstance?.invalidateSize();
            scheduleRomsWcsFetch(true);
        }, 120);
    }

    function populateRomsWcsDepthOptions() {
        romsWcsDepthSelect.innerHTML = '';
        ROMS_DEPTH_LEVELS.forEach((level, index) => {
            const option = document.createElement('option');
            option.value = level.value;
            option.textContent = level.label;
            if (index === 0) {
                option.selected = true;
            }
            romsWcsDepthSelect.appendChild(option);
        });
    }

    function resetRomsWcsState() {
        romsWcsCurrentBbox = null;
        romsWcsCurrentGeoRasterData = null;
        romsWcsCurrentGeoRasterLayer = null;
        romsWcsCurrentNoDataValues = new Set();
        updateRomsWcsBboxDisplay();
        updateRomsWcsValueDisplay(null);
        updateRomsWcsLegend(null);
        setRomsWcsStatus('Select filters to load the visualization.', 'info');

        if (romsWcsDrawnItems) {
            romsWcsDrawnItems.clearLayers();
        }
    }

    function initializeRomsWcsMaps() {
        const filterMapState = WcsUi.initializeFilterMap({
            mapInstance: romsWcsFilterMapInstance,
            mapElement: romsWcsFilterMapElement,
            drawnItems: romsWcsDrawnItems,
            onBboxChange: (bbox) => {
                romsWcsCurrentBbox = bbox;
                updateRomsWcsBboxDisplay();
                scheduleRomsWcsFetch();
            }
        });

        romsWcsFilterMapInstance = filterMapState.mapInstance;
        romsWcsDrawnItems = filterMapState.drawnItems;

        const resultMapState = WcsUi.initializeResultMap({
            mapInstance: romsWcsResultMapInstance,
            mapElement: romsWcsResultMapElement,
            onHover: (lat, lng) => {
                handleRomsWcsResultMapHover(lat, lng);
            },
            onMouseOut: () => {
                updateRomsWcsValueDisplay(null);
            }
        });

        romsWcsResultMapInstance = resultMapState.mapInstance;
    }

    function scheduleRomsWcsFetch(force = false) {
        if (romsWcsFetchTimeout) {
            clearTimeout(romsWcsFetchTimeout);
        }

        const delay = force ? 0 : ROMS_WCS_FETCH_DEBOUNCE_MS;
        romsWcsFetchTimeout = setTimeout(() => {
            romsWcsFetchTimeout = null;
            fetchRomsWcsData();
        }, delay);
    }

    async function fetchRomsWcsData() {
        if (!romsWcsCurrentMetadata?.coverageName) {
            return;
        }

        const { coverageName } = romsWcsCurrentMetadata;
        const baseDate = extractDateFromCoverageName(coverageName);
        if (!baseDate) {
            setRomsWcsStatus('The coverage date could not be determined.', 'error');
            return;
        }

        const offset = Number.parseInt(romsWcsTimeSelect.value, 10) || 0;
        baseDate.setUTCHours(baseDate.getUTCHours() + offset);
        const timeIso = baseDate.toISOString();

        const depthValue = romsWcsDepthSelect.value || '0';

        const params = new URLSearchParams({
            service: 'WCS',
            version: '2.0.1',
            request: 'GetCoverage',
            coverageId: coverageName,
            rangesubset: romsWcsLayerSelect.value || 'Band1'
        });

        params.append('subset', `time("${timeIso}")`);

        // Add depth subset (additional ROMS dimension)
        params.append('subset', `elevation(${depthValue})`);

        if (romsWcsCurrentBbox) {
            params.append('subset', `Long(${romsWcsCurrentBbox.west},${romsWcsCurrentBbox.east})`);
            params.append('subset', `Lat(${romsWcsCurrentBbox.south},${romsWcsCurrentBbox.north})`);
        }

        try {
            setRomsWcsStatus('Loading ROMS data...', 'loading');
            updateRomsWcsValueDisplay(null);
            romsWcsCurrentGeoRasterData = null;
            romsWcsCurrentNoDataValues = new Set();

            const blob = await ApiService.fetchWCSLayer(coverageName, {
                bbox: romsWcsCurrentBbox
                    ? `${romsWcsCurrentBbox.west},${romsWcsCurrentBbox.south},${romsWcsCurrentBbox.east},${romsWcsCurrentBbox.north}`
                    : null,
                time: timeIso,
                elevation: depthValue
            });
            const arrayBuffer = await blob.arrayBuffer();
            const georaster = await parseGeoraster(arrayBuffer);
            romsWcsCurrentGeoRasterData = georaster;

            if (romsWcsCurrentGeoRasterLayer && romsWcsResultMapInstance) {
                romsWcsResultMapInstance.removeLayer(romsWcsCurrentGeoRasterLayer);
            }

            romsWcsCurrentNoDataValues = extractNoDataValues(georaster);
            const valueRange = computeGeoRasterValueRange(georaster, romsWcsCurrentNoDataValues);
            const colorScale = buildRomsColorScale(romsWcsLayerSelect.value, romsWcsCurrentNoDataValues, valueRange);

            romsWcsCurrentGeoRasterLayer = new GeoRasterLayer({
                georaster,
                opacity: 0.75,
                pixelValuesToColorFn: colorScale.colorFn,
                resolution: 256
            });
            romsWcsCurrentGeoRasterLayer.addTo(romsWcsResultMapInstance);

            const bounds = [
                [georaster.ymin, georaster.xmin],
                [georaster.ymax, georaster.xmax]
            ];
            romsWcsResultMapInstance.fitBounds(bounds);

            updateRomsWcsLegend(colorScale);
            setRomsWcsStatus('Data loaded successfully.', 'success');
        } catch (error) {
            Logger.error('ROMS WCS error:', error);
            setRomsWcsStatus('Error loading WCS data.', 'error');
            updateRomsWcsValueDisplay(null);
            romsWcsCurrentGeoRasterData = null;
            if (romsWcsCurrentGeoRasterLayer && romsWcsResultMapInstance) {
                romsWcsResultMapInstance.removeLayer(romsWcsCurrentGeoRasterLayer);
                romsWcsCurrentGeoRasterLayer = null;
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

    function handleRomsWcsResultMapHover(lat, lng) {
        if (!romsWcsCurrentGeoRasterData) {
            return;
        }

        const value = WcsRaster.getValueAtLatLng(romsWcsCurrentGeoRasterData, lat, lng, romsWcsCurrentNoDataValues);
        updateRomsWcsValueDisplay(value);
    }

    function updateRomsWcsBboxDisplay() {
        if (!romsWcsBboxDisplay) {
            return;
        }

        if (!romsWcsCurrentBbox) {
            romsWcsBboxDisplay.innerHTML = '<em>Draw a rectangle on the map</em>';
            romsWcsBboxDisplay.classList.remove('wcs-bbox-display--active');
            return;
        }

        const { north, south, east, west } = romsWcsCurrentBbox;
        romsWcsBboxDisplay.innerHTML = `
            <strong>BBOX:</strong><br>
            N: ${north.toFixed(4)}° | S: ${south.toFixed(4)}°<br>
            E: ${east.toFixed(4)}° | W: ${west.toFixed(4)}°
        `;
        romsWcsBboxDisplay.classList.add('wcs-bbox-display--active');
    }

    function updateRomsWcsValueDisplay(value) {
        if (!romsWcsValueDisplay) {
            return;
        }

        const formatted = formatRomsPixelValue(value);
        romsWcsValueDisplay.textContent = `Value: ${formatted}`;
    }

    function formatRomsPixelValue(value) {
        if (value === null || value === undefined) {
            return '—';
        }

        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < -999 || romsWcsCurrentNoDataValues.has(numeric)) {
            return '—';
        }

        return Number.parseFloat(numeric.toFixed(3)).toString();
    }

    function buildRomsColorScale(layerValue, noDataValues, valueRange) {
        const selectedOption = ROMS_WCS_LAYER_OPTIONS.find((option) => option.value === String(layerValue)) || ROMS_WCS_LAYER_OPTIONS[0];
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

    function updateRomsWcsLegend(colorScale) {
        if (!romsWcsLegend) {
            return;
        }

        if (!colorScale) {
            romsWcsLegend.innerHTML = '';
            return;
        }

        const gradientStops = colorScale.colors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ');

        romsWcsLegend.innerHTML = `
            <div class="wcs-legend__title">${colorScale.label}</div>
            <div class="wcs-legend__gradient" style="background: linear-gradient(to right, ${gradientStops});"></div>
            <div class="wcs-legend__labels">
                <span>${Number.isFinite(colorScale.minValue) ? colorScale.minValue.toFixed(2) : '—'}</span>
                <span>${Number.isFinite(colorScale.maxValue) ? colorScale.maxValue.toFixed(2) : '—'}</span>
            </div>
        `;
    }

    function setRomsWcsStatus(message, type) {
        if (!romsWcsStatus) {
            return;
        }

        romsWcsStatus.textContent = message;
        romsWcsStatus.className = `wcs-status wcs-status--${type}`;
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

    romsWcsLayerSelect.addEventListener('change', () => scheduleRomsWcsFetch());
    romsWcsTimeSelect.addEventListener('change', () => scheduleRomsWcsFetch());
    romsWcsDepthSelect.addEventListener('change', () => scheduleRomsWcsFetch());

    romsWcsClearBboxBtn.addEventListener('click', () => {
        if (romsWcsDrawnItems) {
            romsWcsDrawnItems.clearLayers();
        }
        romsWcsCurrentBbox = null;
        updateRomsWcsBboxDisplay();
        scheduleRomsWcsFetch();
    });

    romsWcsModal.addEventListener('click', (event) => {
        if (event.target?.dataset?.modalDismiss !== undefined) {
            closeRomsWcsModal();
        }
    });

    romsWcsModal.querySelectorAll('[data-modal-dismiss]').forEach((element) => {
        element.addEventListener('click', closeRomsWcsModal);
    });

    function closeRomsWcsModal() {
        romsWcsModal.hidden = true;
        document.body.classList.remove('modal-open');

        if (romsWcsCurrentGeoRasterLayer && romsWcsResultMapInstance) {
            romsWcsResultMapInstance.removeLayer(romsWcsCurrentGeoRasterLayer);
            romsWcsCurrentGeoRasterLayer = null;
        }

        romsWcsCurrentGeoRasterData = null;
        romsWcsCurrentNoDataValues = new Set();
        updateRomsWcsValueDisplay(null);
        updateRomsWcsLegend(null);
        romsWcsCurrentMetadata = null;
    }
})();

