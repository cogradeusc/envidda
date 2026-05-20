/**
 * Shared renderer for catalog detail tables and modal-linked entries.
 */

'use strict';

const CatalogDetailRenderer = (() => {
    const FIELD_CATEGORIES = {
        basic: ['name', 'description', 'label', 'schema', 'version'],
        temporal: ['result_time_start', 'result_time_end', 'phenomenon_time_start', 'phenomenon_time_end', 'valid_time_start', 'valid_time_end'],
        spatial: ['shape', 'crs', 'generated_feature_of_interest_type', 'shared_feature_of_interest_type'],
        metadata: ['keywords', 'contacts', 'documentation', 'lineage'],
        technical: ['observed_properties', 'data_type', 'parameters', 'configuration'],
    };

    let observedPropertyId = 0;

    function configure(options = {}) {
        CatalogEntryRenderer.configure(options);
    }

    function getFieldCategory(key) {
        for (const [category, fields] of Object.entries(FIELD_CATEGORIES)) {
            if (fields.includes(key) || fields.some((field) => key.includes(field))) {
                return category;
            }
        }
        return 'other';
    }

    function createDataTable(data, path = []) {
        const wrapper = document.createElement('div');
        wrapper.className = 'process-card__content';

        if (typeof data !== 'object' || data === null) {
            wrapper.appendChild(CatalogEntryRenderer.createPrimitiveValue(data));
            return wrapper;
        }

        const categorized = {};
        const skipKeys = new Set();

        Object.entries(data).forEach(([key, value]) => {
            if (key === 'json_schema' || skipKeys.has(key)) {
                return;
            }

            if (key === 'data_type') {
                const repeatedValue = Object.prototype.hasOwnProperty.call(data, 'repeated') ? data.repeated : undefined;
                const scopeValue = Object.prototype.hasOwnProperty.call(data, 'scope') ? data.scope : undefined;

                categorized.technical = categorized.technical || [];
                categorized.technical.push({
                    key: 'property_meta',
                    value: { data_type: value, repeated: repeatedValue, scope: scopeValue },
                    special: 'property_meta',
                });

                skipKeys.add('repeated');
                skipKeys.add('scope');
                return;
            }

            if (key === 'repeated' || key === 'scope') {
                return;
            }

            const category = getFieldCategory(key);
            categorized[category] = categorized[category] || [];
            categorized[category].push({ key, value });
        });

        ['basic', 'temporal', 'spatial', 'metadata', 'technical', 'other'].forEach((category) => {
            const fields = categorized[category];
            if (!fields || fields.length === 0) {
                return;
            }

            const section = document.createElement('div');
            section.className = 'data-section';

            const table = document.createElement('table');
            table.className = 'data-table';
            const tbody = document.createElement('tbody');
            table.appendChild(tbody);

            fields.forEach(({ key, value, special }) => {
                const currentPath = [...path, key];

                if (special === 'property_meta') {
                    appendPropertyMetaRow(tbody, value);
                    return;
                }

                if (key === 'observed_properties' && Array.isArray(value)) {
                    appendObservedPropertiesRow(tbody, value, currentPath);
                    return;
                }

                const row = document.createElement('tr');
                row.className = 'data-table__row';

                const header = document.createElement('th');
                header.className = 'data-table__key';
                header.scope = 'row';
                header.textContent = formatFieldLabel(key);

                const cell = document.createElement('td');
                cell.className = 'data-table__value';
                cell.appendChild(CatalogEntryRenderer.createValueNode(
                    value,
                    currentPath,
                    data,
                    createDataTable
                ));

                row.appendChild(header);
                row.appendChild(cell);
                tbody.appendChild(row);
            });

            section.appendChild(table);
            wrapper.appendChild(section);
        });

        return wrapper;
    }

    function appendPropertyMetaRow(tbody, value) {
        const row = document.createElement('tr');
        row.className = 'data-table__row';

        const header = document.createElement('th');
        header.className = 'data-table__key';
        header.scope = 'row';
        header.textContent = 'Data type';

        const cell = document.createElement('td');
        cell.className = 'data-table__value';
        cell.appendChild(CatalogEntryRenderer.createPropertyMetaGroup(
            value.data_type,
            value.repeated,
            value.scope
        ));

        row.appendChild(header);
        row.appendChild(cell);
        tbody.appendChild(row);
    }

    function appendObservedPropertiesRow(tbody, value, currentPath) {
        const row = document.createElement('tr');
        row.className = 'data-table__row';

        const header = document.createElement('th');
        header.className = 'data-table__key';
        header.scope = 'row';
        header.textContent = 'Observed properties';

        const cell = document.createElement('td');
        cell.className = 'data-table__value';
        cell.appendChild(createObservedPropertiesList(value, currentPath));

        row.appendChild(header);
        row.appendChild(cell);
        tbody.appendChild(row);
    }

    function formatFieldLabel(key) {
        const labels = {
            name: 'Name',
            description: 'Description',
            label: 'Label',
            schema: 'Schema',
            version: 'Version',
            procedure: 'Procedure',
            feature_of_interest: 'Feature of Interest',
            observed_property: 'Observed property',
            result_time: 'Result time',
            phenomenon_time: 'Phenomenon time',
            valid_time: 'Valid time',
            result_quality: 'Result quality',
            parameters: 'Parameters',
            keywords: 'Keywords',
            contacts: 'Contacts',
            documentation: 'Documentation',
            lineage: 'Lineage',
            shape: 'Geometry',
            crs: 'Coordinate reference system',
            configuration: 'Configuration',
            feature_type: 'Feature type',
            sampled_feature_type: 'Sampled feature type',
            shared_feature_of_interest_type: 'Shared feature of interest type',
            generated_feature_of_interest_type: 'Generated feature of interest type',
            referenced_type: 'Referenced type',
        };

        if (labels[key]) {
            return labels[key];
        }

        return formatDisplayLabel(key);
    }

    function createObservedPropertiesList(properties, path = []) {
        const container = document.createElement('div');
        container.className = 'observed-properties';

        properties.forEach((property, index) => {
            const card = document.createElement('article');
            card.className = 'observed-property';

            const headerButton = document.createElement('button');
            headerButton.type = 'button';
            headerButton.className = 'observed-property__header';
            headerButton.setAttribute('aria-expanded', 'false');

            const headerContent = document.createElement('div');
            headerContent.className = 'observed-property__header-content';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'observed-property__title';

            const titleIcon = document.createElement('span');
            titleIcon.className = 'observed-property__title-icon';
            titleIcon.textContent = index + 1;

            const titleText = document.createElement('span');
            titleText.textContent = property.name || 'Observed property';

            titleContainer.appendChild(titleIcon);
            titleContainer.appendChild(titleText);

            let subtitle = null;
            if (property.description) {
                subtitle = document.createElement('span');
                subtitle.className = 'observed-property__subtitle';
                subtitle.textContent = property.description;
            }

            const meta = document.createElement('div');
            meta.className = 'observed-property__meta';

            if (property.data_type) {
                const dataTypeBadge = document.createElement('span');
                dataTypeBadge.className = 'observed-property__data-type';
                dataTypeBadge.textContent = typeof property.data_type === 'object'
                    ? (property.data_type.name || 'object')
                    : String(property.data_type);
                meta.appendChild(dataTypeBadge);
            }

            if (property.repeated !== undefined) {
                meta.appendChild(CatalogEntryRenderer.createMetaChip('repeated', property.repeated));
            }

            if (property.scope !== undefined) {
                meta.appendChild(CatalogEntryRenderer.createMetaChip('scope', property.scope));
            }

            headerContent.appendChild(titleContainer);
            if (subtitle) {
                headerContent.appendChild(subtitle);
            }
            if (meta.childElementCount > 0) {
                headerContent.appendChild(meta);
            }

            const icon = document.createElement('span');
            icon.className = 'observed-property__icon';
            icon.setAttribute('aria-hidden', 'true');

            headerButton.appendChild(headerContent);
            headerButton.appendChild(icon);

            const body = document.createElement('div');
            body.className = 'observed-property__body';
            const bodyId = `observed-property-${observedPropertyId++}`;
            body.id = bodyId;
            body.hidden = true;
            headerButton.setAttribute('aria-controls', bodyId);
            body.appendChild(createDataTable(property, path));

            headerButton.addEventListener('click', () => {
                const expanded = headerButton.getAttribute('aria-expanded') === 'true';
                headerButton.setAttribute('aria-expanded', String(!expanded));
                body.hidden = expanded;
                card.classList.toggle('observed-property--open', !expanded);
            });

            card.appendChild(headerButton);
            card.appendChild(body);
            container.appendChild(card);
        });

        return container;
    }

    return {
        configure,
        createDataTable,
    };
})();

window.CatalogDetailRenderer = CatalogDetailRenderer;
