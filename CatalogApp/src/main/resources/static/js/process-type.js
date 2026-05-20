'use strict';

// Field categorization for better organization
const PROCESS_FIELD_CATEGORIES = {
    basic: ['id', 'nombre', 'name', 'descripcion', 'description', 'processId', 'process_id', 'procedure', 'procedure_id'],
    temporal: ['valid_time_scope_data', 'result_time', 'phenomenon_time', 'start_time', 'end_time', 'periodo', 'period'],
    equipment: ['equipo', 'equipment', 'sensores', 'sensors', 'dispositivo', 'device'],
    metadata: ['keywords', 'tags', 'categoria', 'category', 'tipo', 'type'],
    other: []
};

const FIELD_LABELS = {
    // Basic
    id: 'ID',
    nombre: 'Name',
    name: 'Name',
    descripcion: 'Description',
    description: 'Description',
    processId: 'Process ID',
    process_id: 'Process ID',
    procedure: 'Procedure',
    procedure_id: 'Procedure ID',
    base_station_name: 'Base station',
    release_location: 'Location',
    release_location_height: 'Height (m)',
    // Temporal
    valid_time_scope_data: 'Time periods',
    result_time: 'Result time',
    phenomenon_time: 'Phenomenon time',
    start_time: 'Start',
    end_time: 'End',
    periodo: 'Period',
    period: 'Period',
    // Equipment
    equipo: 'Equipment',
    equipment: 'Equipment',
    sensores: 'Sensors',
    sensors: 'Sensors',
    dispositivo: 'Device',
    device: 'Device',
    // Metadata
    keywords: 'Keywords',
    tags: 'Tags',
    categoria: 'Category',
    category: 'Category',
    tipo: 'Type',
    type: 'Type'
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const schemaInput = document.getElementById('schema');
    const nameInput = document.getElementById('name');
    const statusEl = document.getElementById('status');
    const resultsSection = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const resultsToolbar = document.getElementById('results-toolbar');
    const selectAllCheckbox = document.getElementById('select-all-processes');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const startTimeField = startTimeInput ? startTimeInput.closest('.field') : null;
    const endTimeField = endTimeInput ? endTimeInput.closest('.field') : null;
    let selectionCheckboxes = [];
    const viewObservationsButton = document.getElementById('view-observations-button');
    const searchButton = document.getElementById('search-button');

    const OBSERVATION_ROUTES = {
        'vessel_sampling_ieo|vessel': 'vessel.html',
        'roms_meteogalicia|modelo_roms': 'roms.html',
        'wrf_meteogalicia|modelo_wrf': 'wrf.html',
        'ctd_intecmar|configuracion_ctd': 'ctd.html',
        'radiosounding|radiosounding_process': 'radiosounding.html',
        'air_quality|sensor_low_cost_process': 'air-quality.html',
        'air_quality|sensor_calibration_process': 'air-quality.html',
        'air_quality|aq_legal_station_process': 'air-quality.html',
        'air_quality|air_quality_model': 'air-quality.html',
        'traffic|traffic_sensor': 'traffic.html',
        'traffic|traffic_flow_model': 'traffic.html'
    };

    const AIR_QUALITY_PROCESSES = new Set([
        'sensor_low_cost_process',
        'sensor_calibration_process',
        'aq_legal_station_process',
        'air_quality_model'
    ]);

    const RADIOSOUNDING_PROCESSES = new Set([
        'radiosounding_process'
    ]);

    const TRAFFIC_PROCESSES = new Set([
        'traffic_sensor',
        'traffic_flow_model'
    ]);

    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema');
    const nameParam = urlParams.get('name');

    if (schemaParam) {
        schemaInput.value = schemaParam;
    }
    if (nameParam) {
        nameInput.value = nameParam;
    }

    if (!schemaParam || !nameParam) {
        setStatus('This page requires the "schema" and "name" URL parameters.', 'error');
        renderEmptyState('Add "schema" and "name" to the URL to run a search.');
        searchButton.disabled = true;
        form.addEventListener('submit', (event) => event.preventDefault());
        return;
    }

    setStatus('Ready to search processes.', 'info');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const keyword = (formData.get('keyword') || '').trim();
        const canFilterByDate = !shouldDisableDateFilters(schemaParam, nameParam);
        const startTime = canFilterByDate ? (formData.get('start-time') || '').trim() : '';
        const endTime = canFilterByDate ? (formData.get('end-time') || '').trim() : '';

        const params = new URLSearchParams();
        params.append('schema', schemaParam);
        params.append('name', nameParam);
        if (keyword) {
            params.append('keyword', keyword);
        }
        if (startTime) {
            params.append('start-time', ProcessTypeRenderer.formatDateTime(startTime));
        }
        if (endTime) {
            params.append('end-time', ProcessTypeRenderer.formatDateTime(endTime));
        }

        setStatus('Searching...', 'loading');
        resultsSection.setAttribute('aria-busy', 'true');
        renderEmptyState('Preparing results...');
        searchButton.disabled = true;

        try {
            const data = await ApiService.fetchFilteredProcessTypes({
                schema: schemaParam,
                name: nameParam,
                keyword,
                startTime: startTime ? ProcessTypeRenderer.formatDateTime(startTime) : '',
                endTime: endTime ? ProcessTypeRenderer.formatDateTime(endTime) : ''
            });

            if (!Array.isArray(data) || data.length === 0) {
                renderEmptyState('No data for the applied filters.');
                setStatus('No results.', 'info');
                return;
            }

            renderProcessCards(data);
            setStatus(`Found ${data.length} processes.`, 'success');
        } catch (error) {
            Logger.error('Error filtering process types:', error);
            renderEmptyState('Unable to retrieve data. Please try again later.');
            setStatus('Error running the search.', 'error');
            if (window.notifications) {
                notifications.error('Error filtering processes. Please try again.');
            }
        } finally {
            resultsSection.setAttribute('aria-busy', 'false');
            searchButton.disabled = false;
        }
    });

    updateDateFilterState();

    function setStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = `status status--${type}`;
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;
            selectionCheckboxes.forEach((checkbox) => {
                checkbox.checked = isChecked;
            });
            selectAllCheckbox.indeterminate = false;
            updateObservationsButton();
        });
    }

    if (viewObservationsButton) {
        viewObservationsButton.addEventListener('click', () => {
            const selectedCheckboxes = selectionCheckboxes.filter((checkbox) => checkbox.checked);

            if (selectedCheckboxes.length === 0) {
                return;
            }

            const targetPage = determineObservationRoute(schemaParam, nameParam);

            if (!targetPage) {
                setStatus('There is no observations page for this process.', 'error');
                return;
            }

            const procedures = selectedCheckboxes
                .map((checkbox) => checkbox.dataset.procedure)
                .filter(Boolean);

            if (procedures.length === 0) {
                setStatus('Unable to determine the selected processes.', 'error');
                return;
            }

            const canFilterByDate = !shouldDisableDateFilters(schemaParam, nameParam);
            const startDateParam = canFilterByDate ? computeMinStartDate(selectedCheckboxes) : null;
            const endDateParam = canFilterByDate ? computeMaxEndDate(selectedCheckboxes) : null;

            const params = new URLSearchParams();
            params.set('schema', schemaParam);
            params.set('name', nameParam);
            params.set('procedure', procedures.join(','));
            if (startDateParam) {
                params.set('startDate', startDateParam);
            }
            if (endDateParam) {
                params.set('endDate', endDateParam);
            }

            window.location.href = `${targetPage}?${params.toString()}`;
        });
    }

    function updateSelectAllState() {
        if (!selectAllCheckbox) {
            return;
        }
        if (selectionCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            updateObservationsButton();
            return;
        }
        const checkedCount = selectionCheckboxes.filter((checkbox) => checkbox.checked).length;
        selectAllCheckbox.checked = checkedCount === selectionCheckboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < selectionCheckboxes.length;
        updateObservationsButton();
    }

    function updateObservationsButton() {
        if (!viewObservationsButton) {
            return;
        }
        const hasSelection = selectionCheckboxes.some((checkbox) => checkbox.checked);
        viewObservationsButton.disabled = !hasSelection;
    }

    function resetSelectionState() {
        selectionCheckboxes = [];
        updateSelectAllState();
        updateObservationsButton();
    }

    function renderEmptyState(message) {
        if (resultsToolbar) {
            resultsToolbar.hidden = true;
        }
        if (resultsList) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = message;
            resultsList.replaceChildren(emptyState);
        } else {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = message;
            resultsSection.replaceChildren(emptyState);
        }
        resetSelectionState();
    }

    function renderProcessCards(processes) {
        if (resultsList) {
            resultsList.innerHTML = '';
        } else {
            resultsSection.innerHTML = '';
        }

        if (resultsToolbar) {
            resultsToolbar.hidden = processes.length === 0;
        }

        selectionCheckboxes = [];

        processes.forEach((processItem, index) => {
            const card = document.createElement('article');
            card.className = 'process-card';

            const header = document.createElement('div');
            header.className = 'process-card__header';

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'process-card__toggle';
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.setAttribute('aria-controls', `process-card-body-${index}`);

            const title = document.createElement('span');
            title.className = 'process-card__title';
            title.textContent = processItem.name || processItem.nombre || `Process ${processItem.processId ?? ''}` || 'Unnamed process';

            const subtitle = document.createElement('span');
            subtitle.className = 'process-card__subtitle';
            subtitle.textContent = buildSubtitle(processItem);

            const procedureId = processItem.processId ?? processItem.process_id ?? processItem.id;
            const timeRange = getProcessTimeRange(processItem);

            const icon = document.createElement('span');
            icon.className = 'process-card__icon';
            icon.setAttribute('aria-hidden', 'true');

            const info = document.createElement('span');
            info.className = 'process-card__info';
            info.appendChild(title);
            info.appendChild(subtitle);

            toggleButton.appendChild(info);
            toggleButton.appendChild(icon);

            header.appendChild(toggleButton);

            const selector = document.createElement('label');
            selector.className = 'process-card__selector process-card__selector--icon';

            const selectorCheckbox = document.createElement('input');
            selectorCheckbox.type = 'checkbox';
            selectorCheckbox.className = 'process-card__selector-input';
            selectorCheckbox.setAttribute('aria-label', `Select ${title.textContent}`);

            if (procedureId !== undefined && procedureId !== null) {
                selectorCheckbox.dataset.procedure = String(procedureId);
            }
            if (timeRange.start) {
                selectorCheckbox.dataset.startDate = timeRange.start;
            }
            if (timeRange.end) {
                selectorCheckbox.dataset.endDate = timeRange.end;
            }

            selector.appendChild(selectorCheckbox);
            header.appendChild(selector);

            selectionCheckboxes.push(selectorCheckbox);
            selectorCheckbox.addEventListener('change', () => {
                updateSelectAllState();
            });

            const body = document.createElement('div');
            body.className = 'process-card__body';
            body.id = `process-card-body-${index}`;
            body.hidden = true;

            body.appendChild(ProcessTypeRenderer.createProcessContent(normalizeProcess(processItem), {
                fieldCategories: PROCESS_FIELD_CATEGORIES,
                fieldLabels: FIELD_LABELS,
                isRadiosoundingProcessType: isRadiosoundingProcessType()
            }));

            toggleButton.addEventListener('click', () => {
                const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
                toggleButton.setAttribute('aria-expanded', String(!expanded));
                body.hidden = expanded;
                card.classList.toggle('process-card--open', !expanded);
            });

            card.appendChild(header);
            card.appendChild(body);

            if (resultsList) {
                resultsList.appendChild(card);
            } else {
                resultsSection.appendChild(card);
            }
        });

        updateSelectAllState();
    }

    function buildSubtitle(processItem) {
        const fragments = [];
        if (processItem.processId !== undefined && processItem.processId !== null) {
            fragments.push(`ID: ${processItem.processId}`);
        }
        if (isRadiosoundingProcessType() && processItem.base_station_name) {
            fragments.push(processItem.base_station_name);
        }
        if (processItem.equipo && processItem.equipo.nombre) {
            fragments.push(processItem.equipo.nombre);
        }
        const timeRange = getProcessTimeRange(processItem);
        if (timeRange.start || timeRange.end) {
            const startLabel = timeRange.start ? ProcessTypeRenderer.formatDate(timeRange.start) : '—';
            const endLabel = timeRange.end ? ProcessTypeRenderer.formatDate(timeRange.end) : '—';
            fragments.push(`${startLabel} → ${endLabel}`);
        }
        return fragments.join(' • ') || 'No additional details';
    }

    function updateDateFilterState() {
        if (!startTimeInput || !endTimeInput) {
            return;
        }
        if (shouldDisableDateFilters(schemaParam, nameParam)) {
            startTimeInput.value = '2000-01-01T00:00';
            startTimeInput.disabled = true;
            startTimeInput.setAttribute('aria-disabled', 'true');
            startTimeField?.classList.add('field--disabled');

            
            endTimeInput.value = '2030-01-01T00:00';
            endTimeInput.disabled = true;
            endTimeInput.setAttribute('aria-disabled', 'true');
            endTimeField?.classList.add('field--disabled');
        } else {
            startTimeInput.disabled = false;
            startTimeInput.removeAttribute('aria-disabled');
            startTimeField?.classList.remove('field--disabled');

            endTimeInput.disabled = false;
            endTimeInput.removeAttribute('aria-disabled');
            endTimeField?.classList.remove('field--disabled');
        }
    }

    function getProcessTimeRange(processItem) {
        const scopeData = Array.isArray(processItem.valid_time_scope_data)
            ? processItem.valid_time_scope_data
            : [];
        const period = scopeData[0]?.valid_time_period;
        let startValue;
        let endValue;

        if (Array.isArray(period)) {
            [startValue, endValue] = period;
        } else if (period && typeof period === 'object') {
            startValue = period[0] ?? period.start ?? period.begin ?? period.beginPosition;
            endValue = period[1] ?? period.end ?? period.endPosition ?? period.finish;
        }

        return {
            start: normalizeDateValue(startValue),
            end: normalizeDateValue(endValue)
        };
    }

    function normalizeDateValue(value) {
        if (!value) {
            return undefined;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return undefined;
        }
        return date.toISOString();
    }

    function determineObservationRoute(schema, name) {
        if (!schema || !name) {
            return null;
        }
        // Check for exact match first
        const exactMatch = OBSERVATION_ROUTES[`${schema}|${name}`];
        if (exactMatch) {
            return exactMatch;
        }
        // Handle meteostations processes dynamically
        if (schema === 'meteostations_meteogalicia') {
            return 'meteostations.html';
        }
        // Handle air quality processes dynamically
        if (schema === 'air_quality' && AIR_QUALITY_PROCESSES.has(name)) {
            return 'air-quality.html';
        }
        // Handle radiosounding processes dynamically
        if (schema === 'radiosounding' && RADIOSOUNDING_PROCESSES.has(name)) {
            return 'radiosounding.html';
        }
        // Handle traffic processes dynamically
        if (schema === 'traffic' && TRAFFIC_PROCESSES.has(name)) {
            return 'traffic.html';
        }
        return null;
    }

    function shouldDisableDateFilters(schema, name) {
        return (
            (schema === 'roms_meteogalicia' && name === 'modelo_roms') ||
            (schema === 'wrf_meteogalicia' && name === 'modelo_wrf') ||
            (schema === 'radiosounding' && name === 'radiosounding_process')
        );
    }

    const DEFAULT_START_DATE = '2000-01-01T00:00:00';
    const DEFAULT_END_DATE = '2030-01-01T00:00:00';

    function computeMinStartDate(selectedCheckboxes) {
        const timestamps = selectedCheckboxes
            .map((checkbox) => parseDateFromDataset(checkbox.dataset.startDate))
            .filter(Boolean)
            .map((date) => date.getTime());

        if (timestamps.length === 0) {
            return DEFAULT_START_DATE;
        }

        const minTimestamp = Math.min(...timestamps);
        return new Date(minTimestamp).toISOString();
    }

    function computeMaxEndDate(selectedCheckboxes) {
        const timestamps = selectedCheckboxes.map((checkbox) => {
            const parsed = parseDateFromDataset(checkbox.dataset.endDate);
            return (parsed ?? new Date()).getTime();
        });

        if (timestamps.length === 0) {
            return DEFAULT_END_DATE;
        }

        const maxTimestamp = Math.max(...timestamps);
        return new Date(maxTimestamp).toISOString();
    }

    function parseDateFromDataset(value) {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date;
    }

    function isRadiosoundingProcessType() {
        return schemaParam === 'radiosounding' && nameParam === 'radiosounding_process';
    }

    function normalizeProcess(processItem) {
        // Return original JSON without any key translation or normalization
        return processItem;
    }
});

