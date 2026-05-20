/**
 * LENDAS Process Type Renderer
 * Encapsulates the heavy DOM rendering logic for process type detail cards.
 */

'use strict';

const ProcessTypeRenderer = (() => {
    let periodPanelCounter = 0;
    let equipmentPanelCounter = 0;
    let sensorPanelCounter = 0;

    function getFieldCategory(key, fieldCategories) {
        for (const [category, fields] of Object.entries(fieldCategories)) {
            if (fields.includes(key) || fields.some((field) => key.includes(field))) {
                return category;
            }
        }
        return 'other';
    }

    function getCategoryLabel(category) {
        const labels = {
            basic: 'Basic information',
            temporal: 'Temporal',
            equipment: 'Equipment',
            metadata: 'Metadata',
            other: 'Other data'
        };
        return labels[category] || category;
    }

    function getCategoryIcon(category) {
        const icons = {
            basic: '📋',
            temporal: '🕐',
            equipment: '🔧',
            metadata: '📎',
            other: '📄'
        };
        return icons[category] || '📄';
    }

    function getFieldLabel(key, fieldLabels) {
        return fieldLabels[key] || formatDisplayLabel(key);
    }

    function createProcessContent(data, options = {}) {
        const { fieldCategories = {}, fieldLabels = {}, isRadiosoundingProcessType = false } = options;

        if (isRadiosoundingProcessType) {
            return createRadiosoundingProcessContent(data);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'process-card__content';

        if (typeof data !== 'object' || data === null) {
            wrapper.appendChild(createScalarElement(data));
            return wrapper;
        }

        const categorized = {};

        Object.entries(data).forEach(([key, value]) => {
            const category = getFieldCategory(key, fieldCategories);
            categorized[category] = categorized[category] || [];
            categorized[category].push({ key, value });
        });

        ['basic', 'temporal', 'equipment', 'metadata', 'other'].forEach((category) => {
            const fields = categorized[category];
            if (!fields || fields.length === 0) {
                return;
            }

            const section = document.createElement('div');
            section.className = 'data-section';

            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'data-section__header';
            sectionHeader.innerHTML = `
                <span class="data-section__icon">${getCategoryIcon(category)}</span>
                <span class="data-section__title">${getCategoryLabel(category)}</span>
            `;
            section.appendChild(sectionHeader);

            const table = document.createElement('table');
            table.className = 'data-table';
            const tbody = document.createElement('tbody');

            fields.forEach(({ key, value }) => {
                const row = document.createElement('tr');
                row.className = 'data-table__row';

                const header = document.createElement('th');
                header.scope = 'row';
                header.className = 'data-table__key';
                header.textContent = getFieldLabel(key, fieldLabels);

                const cell = document.createElement('td');
                cell.className = 'data-table__value';
                cell.appendChild(createValueElement(value, key, fieldLabels));

                row.appendChild(header);
                row.appendChild(cell);
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            section.appendChild(table);
            wrapper.appendChild(section);
        });

        return wrapper;
    }

    function createRadiosoundingProcessContent(data) {
        const wrapper = document.createElement('div');
        wrapper.className = 'process-card__content';

        if (typeof data !== 'object' || data === null) {
            wrapper.appendChild(createScalarElement(data));
            return wrapper;
        }

        const section = document.createElement('div');
        section.className = 'data-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'data-section__header';
        sectionHeader.innerHTML = `
            <span class="data-section__icon">[b]</span>
            <span class="data-section__title">Launch</span>
        `;
        section.appendChild(sectionHeader);

        const table = document.createElement('table');
        table.className = 'data-table';
        const tbody = document.createElement('tbody');

        appendRadiosoundingRow(tbody, 'Process ID', data.processId ?? data.process_id ?? data.id);
        appendRadiosoundingRow(tbody, 'Station', data.base_station_name);

        const releaseLocation = formatReleaseLocation(data.release_location);
        appendRadiosoundingRow(tbody, 'Location', `${releaseLocation.text} [${releaseLocation.crs}]`);
        appendRadiosoundingRow(tbody, 'Height (m)', data.release_location_height);

        table.appendChild(tbody);
        section.appendChild(table);
        wrapper.appendChild(section);
        return wrapper;
    }

    function appendRadiosoundingRow(tbody, label, value) {
        const row = document.createElement('tr');
        row.className = 'data-table__row';

        const header = document.createElement('th');
        header.scope = 'row';
        header.className = 'data-table__key';
        header.textContent = label;

        const cell = document.createElement('td');
        cell.className = 'data-table__value';
        cell.appendChild(createScalarElement(value));

        row.appendChild(header);
        row.appendChild(cell);
        tbody.appendChild(row);
    }

    function formatReleaseLocation(releaseLocation) {
        if (!releaseLocation || typeof releaseLocation !== 'object') {
            return { text: null, crs: null };
        }

        const coordinates = Array.isArray(releaseLocation.coordinates) ? releaseLocation.coordinates : null;
        const longitude = coordinates && coordinates.length > 0 ? coordinates[0] : null;
        const latitude = coordinates && coordinates.length > 1 ? coordinates[1] : null;
        const crs = releaseLocation?.crs?.properties?.name || null;

        if (longitude === null || latitude === null) {
            return { text: null, crs };
        }

        return {
            text: `[${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}]`,
            crs
        };
    }

    function buildTable(objectData, nested = false, fieldLabels = {}) {
        const table = document.createElement('table');
        table.className = 'data-table';
        const tbody = document.createElement('tbody');

        Object.entries(objectData).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.className = 'data-table__row';

            const header = document.createElement('th');
            header.scope = 'row';
            header.textContent = getFieldLabel(key, fieldLabels);
            header.className = 'data-table__key';

            const cell = document.createElement('td');
            cell.className = 'data-table__value';
            cell.appendChild(createValueElement(value, key, fieldLabels));

            row.appendChild(header);
            row.appendChild(cell);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        if (!nested) {
            return table;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'data-table__nested';
        wrapper.appendChild(table);
        return wrapper;
    }

    function createValueElement(value, parentKey = '', fieldLabels = {}) {
        if (Array.isArray(value)) {
            const list = document.createElement('ul');
            list.className = 'data-table__list';

            if (parentKey === 'valid_time_scope_data') {
                list.classList.add('data-table__list--periods');
            }

            if (value.length === 0) {
                return createEmptyState();
            }

            value.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'data-table__list-item';

                if (parentKey === 'valid_time_scope_data') {
                    listItem.appendChild(createPeriodCollapsible(item, fieldLabels));
                } else if (parentKey === 'sensores' || parentKey === 'sensors') {
                    listItem.appendChild(createSensorPanel(item, index, fieldLabels));
                } else if (item && typeof item === 'object') {
                    listItem.appendChild(createCompactObjectCard(item, fieldLabels));
                } else {
                    listItem.appendChild(createScalarElement(item));
                }

                list.appendChild(listItem);
            });

            return list;
        }

        if (value && typeof value === 'object') {
            if (parentKey === 'equipo' || parentKey === 'equipment') {
                return createEquipmentPanel(value, fieldLabels);
            }
            return createCompactObjectCard(value, fieldLabels);
        }

        return createScalarElement(value);
    }

    function createEmptyState() {
        const empty = document.createElement('span');
        empty.className = 'data-table__empty';
        empty.innerHTML = '—';
        return empty;
    }

    function createCompactObjectCard(obj, fieldLabels = {}) {
        const card = document.createElement('div');
        card.className = 'compact-card';

        const entries = Object.entries(obj).slice(0, 4);

        entries.forEach(([key, value]) => {
            const item = document.createElement('div');
            item.className = 'compact-card__item';

            const label = document.createElement('span');
            label.className = 'compact-card__label';
            label.textContent = getFieldLabel(key, fieldLabels);

            const compactValue = document.createElement('span');
            compactValue.className = 'compact-card__value';
            compactValue.textContent = formatCompactValue(value);

            item.appendChild(label);
            item.appendChild(compactValue);
            card.appendChild(item);
        });

        if (Object.keys(obj).length > 4) {
            const more = document.createElement('div');
            more.className = 'compact-card__more';
            more.textContent = `+${Object.keys(obj).length - 4} more`;
            card.appendChild(more);
        }

        return card;
    }

    function formatCompactValue(value) {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return `[${value.length} items]`;
        if (typeof value === 'object') return '{...}';
        return String(value).substring(0, 50);
    }

    function createEquipmentGrid(equipment, fieldLabels = {}) {
        const container = document.createElement('div');
        container.className = 'equipment-grid';

        Object.entries(equipment).forEach(([key, value]) => {
            const term = document.createElement('div');
            term.className = 'equipment-grid__term';
            term.textContent = getFieldLabel(key, fieldLabels);

            const description = document.createElement('div');
            description.className = 'equipment-grid__description';
            description.appendChild(createValueElement(value, key, fieldLabels));

            container.appendChild(term);
            container.appendChild(description);
        });

        return container;
    }

    function createEquipmentPanel(equipment, fieldLabels = {}) {
        const container = document.createElement('div');
        container.className = 'equipment-panel';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'equipment-panel__header';

        const panelId = `equipment-panel-${equipmentPanelCounter++}`;
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panelId);

        const icon = document.createElement('span');
        icon.className = 'equipment-panel__icon';
        icon.textContent = '🔧';

        const content = document.createElement('div');
        content.className = 'equipment-panel__content';

        const title = document.createElement('span');
        title.className = 'equipment-panel__title';
        title.textContent = equipment.name || equipment.nombre || 'Equipment';

        const summary = document.createElement('span');
        summary.className = 'equipment-panel__summary';
        summary.textContent = buildEquipmentSummary(equipment);

        content.appendChild(title);
        content.appendChild(summary);

        const chevron = document.createElement('span');
        chevron.className = 'equipment-panel__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        button.appendChild(icon);
        button.appendChild(content);
        button.appendChild(chevron);

        const body = document.createElement('div');
        body.className = 'equipment-panel__body';
        body.id = panelId;
        body.hidden = true;
        body.appendChild(createEquipmentGrid(equipment, fieldLabels));

        button.addEventListener('click', () => {
            const expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!expanded));
            body.hidden = expanded;
            container.classList.toggle('equipment-panel--open', !expanded);
        });

        container.appendChild(button);
        container.appendChild(body);
        return container;
    }

    function createSensorPanel(sensor, index, fieldLabels = {}) {
        const container = document.createElement('div');
        container.className = 'sensor-panel';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sensor-panel__header';

        const panelId = `sensor-panel-${sensorPanelCounter++}`;
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panelId);

        const icon = document.createElement('span');
        icon.className = 'sensor-panel__icon';
        icon.textContent = '📡';

        const content = document.createElement('div');
        content.className = 'sensor-panel__content';

        const title = document.createElement('span');
        title.className = 'sensor-panel__title';
        title.textContent = sensor.nombre || sensor.name || `Sensor ${index + 1}`;

        const summary = document.createElement('span');
        summary.className = 'sensor-panel__summary';
        summary.textContent = buildSensorSummary(sensor, index);

        content.appendChild(title);
        content.appendChild(summary);

        const chevron = document.createElement('span');
        chevron.className = 'sensor-panel__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        button.appendChild(icon);
        button.appendChild(content);
        button.appendChild(chevron);

        const body = document.createElement('div');
        body.className = 'sensor-panel__body';
        body.id = panelId;
        body.hidden = true;
        body.appendChild(buildTable(sensor, true, fieldLabels));

        button.addEventListener('click', () => {
            const expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!expanded));
            body.hidden = expanded;
            container.classList.toggle('sensor-panel--open', !expanded);
        });

        container.appendChild(button);
        container.appendChild(body);
        return container;
    }

    function buildEquipmentSummary(equipment) {
        const fragments = [];

        if (equipment?.id !== undefined && equipment?.id !== null) {
            fragments.push(`ID: ${equipment.id}`);
        }

        const type = equipment?.tipo ?? equipment?.type ?? equipment?.modelo;
        if (type) {
            fragments.push(`Type: ${formatValue(type)}`);
        }

        const sensorCount = equipment?.sensores?.length || equipment?.sensors?.length;
        if (sensorCount) {
            fragments.push(`${sensorCount} sensor${sensorCount > 1 ? 's' : ''}`);
        }

        return fragments.join(' • ') || 'Show equipment details';
    }

    function buildSensorSummary(sensor, index) {
        const fragments = [];

        const sensorId = sensor?.id ?? sensor?.sensor_id ?? sensor?.identifier;
        if (sensorId !== undefined && sensorId !== null) {
            fragments.push(`ID: ${sensorId}`);
        }

        const type = sensor?.tipo ?? sensor?.type ?? sensor?.tipo_sensor;
        if (type) {
            fragments.push(`Type: ${formatValue(type)}`);
        }

        const unit = sensor?.unidad ?? sensor?.unit ?? sensor?.unidad_medida;
        if (unit) {
            fragments.push(`Unit: ${formatValue(unit)}`);
        }

        return fragments.join(' • ') || `Sensor ${index + 1}`;
    }

    function createPeriodCollapsible(period, fieldLabels = {}) {
        const container = document.createElement('div');
        container.className = 'period-panel';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'period-panel__header';

        const panelId = `period-panel-${periodPanelCounter++}`;
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panelId);

        const icon = document.createElement('span');
        icon.className = 'period-panel__icon';
        icon.textContent = '🕐';

        const content = document.createElement('div');
        content.className = 'period-panel__content';

        const summary = document.createElement('span');
        summary.className = 'period-panel__summary';
        summary.textContent = buildPeriodSummary(period);

        content.appendChild(summary);

        const chevron = document.createElement('span');
        chevron.className = 'period-panel__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        button.appendChild(icon);
        button.appendChild(content);
        button.appendChild(chevron);

        const body = document.createElement('div');
        body.className = 'period-panel__body';
        body.id = panelId;
        body.hidden = true;
        body.appendChild(buildTable(period, true, fieldLabels));

        button.addEventListener('click', () => {
            const expanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!expanded));
            body.hidden = expanded;
            container.classList.toggle('period-panel--open', !expanded);
        });

        container.appendChild(button);
        container.appendChild(body);
        return container;
    }

    function buildPeriodSummary(period) {
        const range = period && period.valid_time_period;

        if (Array.isArray(range) && range.length >= 2) {
            const start = range[0];
            const end = range[1];

            if (start && end) return `${formatDateShort(start)} → ${formatDateShort(end)}`;
            if (start) return `From ${formatDateShort(start)}`;
            if (end) return `Until ${formatDateShort(end)}`;
        } else if (range) {
            return formatDateShort(range);
        }

        return 'Period details';
    }

    function formatDateShort(value) {
        if (!value) return '—';
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;

            return date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (_error) {
            return value;
        }
    }

    function createScalarElement(value) {
        const text = document.createElement('span');

        if (value === null || value === undefined) {
            text.className = 'data-text data-text--empty';
            text.textContent = '—';
        } else if (typeof value === 'boolean') {
            text.className = value ? 'data-text data-text--boolean-true' : 'data-text data-text--boolean-false';
            text.textContent = value ? 'Yes' : 'No';
        } else if (typeof value === 'number') {
            text.className = 'data-text data-text--number';
            text.textContent = isHumanizableIdentifier(value) ? humanizeIdentifier(value) : String(value);
        } else if (isDateString(value)) {
            text.className = 'data-text data-text--date';
            text.textContent = formatDate(value);
        } else {
            text.className = 'data-text';
            text.textContent = String(value);
        }

        return text;
    }

    function isDateString(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(new Date(value).getTime());
    }

    function formatDateTime(value) {
        if (!value) {
            return value;
        }
        return value.length === 16 ? `${value}:00` : value;
    }

    function formatDate(value) {
        if (!value) {
            return '—';
        }
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return value;
            }
            return date.toLocaleString();
        } catch (_error) {
            return value;
        }
    }

    return {
        createProcessContent,
        formatDate,
        formatDateTime
    };
})();

window.ProcessTypeRenderer = ProcessTypeRenderer;
