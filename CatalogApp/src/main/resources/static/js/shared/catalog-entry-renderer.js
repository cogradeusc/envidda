/**
 * Shared value and entry renderer for catalog detail tables.
 */

'use strict';

const CatalogEntryRenderer = (() => {
    const FEATURE_TYPE_REFERENCE_KEYS = new Set([
        'feature_type',
        'sampled_feature_type',
        'shared_feature_of_interest_type',
    ]);

    let openCatalogModal = () => {};

    function configure(options = {}) {
        if (typeof options.openCatalogModal === 'function') {
            openCatalogModal = options.openCatalogModal;
        }
    }

    function createValueNode(value, path = [], parent = null, createNestedTable = () => createPrimitiveValue(value)) {
        if (Array.isArray(value)) {
            return createArrayNode(value, path, createNestedTable);
        }

        if (isNameEntry(value)) {
            return createNameEntry(value);
        }

        if (isKeywordEntry(value)) {
            return createKeywordEntry(value);
        }

        if (isFeatureTypeEntry(path, value)) {
            return createFeatureTypeSummary(value);
        }

        if (matchesFeatureTypeNameTarget(path) && parent && parent.schema) {
            const label = typeof value === 'string' ? value : formatValue(value);
            return createFeatureTypeButton(parent.schema, parent.name ?? value, label);
        }

        if (isContactEntry(value)) {
            return createContactEntry(value);
        }

        if (isReferencedTypeEntry(path, value)) {
            return createDataTypeEntry(value, { hideChip: true, allowModal: false });
        }

        if (isDataTypeEntry(value)) {
            return createDataTypeEntry(value, { allowModal: true });
        }

        if (value && typeof value === 'object') {
            const container = document.createElement('div');
            container.className = 'data-table__nested';
            container.appendChild(createNestedTable(value, path));
            return container;
        }

        return createPrimitiveValue(value);
    }

    function createArrayNode(value, path, createNestedTable) {
        if (value.length === 0) {
            return createPrimitiveValue('—');
        }

        if (value.every(isKeywordEntry)) {
            const collection = document.createElement('div');
            collection.className = 'keyword-collection';
            value.forEach((item) => {
                collection.appendChild(createKeywordEntry(item));
            });
            return collection;
        }

        if (value.every(isContactEntry)) {
            const collection = document.createElement('div');
            collection.className = 'contact-collection';
            value.forEach((item) => {
                collection.appendChild(createContactEntry(item));
            });
            return collection;
        }

        if (value.every(isNameEntry)) {
            return createNamesCollapsible(value);
        }

        const list = document.createElement('ul');
        list.className = 'data-table__list';

        value.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'data-table__list-item';
            listItem.setAttribute('data-index', index + 1);
            listItem.appendChild(createValueNode(item, [...path, String(index)], value, createNestedTable));
            list.appendChild(listItem);
        });

        return list;
    }

    function createPrimitiveValue(value) {
        const text = document.createElement('span');
        text.className = 'data-text';
        text.textContent = formatValue(value);
        return text;
    }

    function isNameEntry(value) {
        return (
            value &&
            typeof value === 'object' &&
            Object.prototype.hasOwnProperty.call(value, 'term') &&
            Object.prototype.hasOwnProperty.call(value, 'vocabulary') &&
            value.vocabulary &&
            typeof value.vocabulary === 'object'
        );
    }

    function isDataTypeEntry(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }

        const keys = Object.keys(value).filter((key) => key !== 'json_schema');
        return (
            Object.prototype.hasOwnProperty.call(value, 'name') &&
            Object.prototype.hasOwnProperty.call(value, 'schema') &&
            keys.length <= 3
        );
    }

    function isReferencedTypeEntry(path, value) {
        return (
            Array.isArray(path) &&
            path[path.length - 1] === 'referenced_type' &&
            isDataTypeEntry(value)
        );
    }

    function isFeatureTypeEntry(path, value) {
        return isCatalogTypeReference(path, value, FEATURE_TYPE_REFERENCE_KEYS);
    }

    function isKeywordEntry(value) {
        return value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'keyword');
    }

    function isContactEntry(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }

        const contactKeys = ['organisation_name', 'individual_name', 'electronic_mail_address', 'role', 'telephone'];
        return contactKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    }

    function createNamesCollapsible(namesArray) {
        const container = document.createElement('div');
        container.className = 'names-collapsible';

        const namesId = `names-${Math.random().toString(36).slice(2, 11)}`;

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'names-collapsible__header';
        header.setAttribute('aria-expanded', 'false');
        header.setAttribute('aria-controls', namesId);

        const countBadge = document.createElement('span');
        countBadge.className = 'names-collapsible__count';
        countBadge.textContent = namesArray.length;

        const label = document.createElement('span');
        label.className = 'names-collapsible__label';
        label.textContent = namesArray.length === 1 ? 'Name' : 'Names';

        const chevron = document.createElement('span');
        chevron.className = 'names-collapsible__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        header.appendChild(countBadge);
        header.appendChild(label);
        header.appendChild(chevron);

        const content = document.createElement('div');
        content.id = namesId;
        content.className = 'names-collapsible__content';
        content.hidden = true;

        namesArray.forEach((entry) => {
            content.appendChild(createNameEntry(entry));
        });

        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', String(!isExpanded));
            content.hidden = isExpanded;
            container.classList.toggle('names-collapsible--open', !isExpanded);
        });

        container.appendChild(header);
        container.appendChild(content);
        return container;
    }

    function createNameEntry(entry) {
        const container = document.createElement('div');
        container.className = 'name-entry';

        const termColumn = document.createElement('div');
        termColumn.className = 'name-entry__term';
        termColumn.textContent = entry.term;
        container.appendChild(termColumn);

        if (entry.vocabulary && typeof entry.vocabulary === 'object') {
            const vocabColumn = document.createElement('div');
            vocabColumn.className = 'name-entry__vocabulary';

            const schema = entry.vocabulary.schema;
            const name = entry.vocabulary.name;

            if (schema && name) {
                const vocabLink = document.createElement('button');
                vocabLink.type = 'button';
                vocabLink.className = 'name-entry__vocab-link';
                vocabLink.textContent = `${schema}.${name}`;
                vocabLink.addEventListener('click', () => {
                    openCatalogModal({
                        endpoint: '/api/catalog/vocabulary',
                        schema,
                        name,
                        label: name,
                        title: `Vocabulary: ${name}`,
                        errorLabel: 'vocabulary',
                    });
                });
                vocabColumn.appendChild(vocabLink);
            } else {
                const vocabText = document.createElement('span');
                vocabText.className = 'name-entry__vocab-text';
                vocabText.textContent = [schema, name].filter(Boolean).join('.') || '—';
                vocabColumn.appendChild(vocabText);
            }

            container.appendChild(vocabColumn);
        }

        return container;
    }

    function matchesFeatureTypeNameTarget(path) {
        return (
            Array.isArray(path) &&
            path[path.length - 1] === 'name' &&
            FEATURE_TYPE_REFERENCE_KEYS.has(path[path.length - 2])
        );
    }

    function createFeatureTypeButton(schema, name, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'feature-link';
        button.textContent = label;
        button.addEventListener('click', () => {
            openCatalogModal({ schema, name, label });
        });
        return button;
    }

    function isCatalogTypeReference(path, value, referenceKeys) {
        return (
            isDataTypeEntry(value) &&
            Array.isArray(path) &&
            referenceKeys.has(path[path.length - 1])
        );
    }

    function createFeatureTypeSummary(entry) {
        if (!entry || typeof entry !== 'object') {
            return createPrimitiveValue(entry);
        }

        if (!entry.schema || !entry.name) {
            return createPrimitiveValue(entry.name ?? entry);
        }

        const container = document.createElement('div');
        container.className = 'feature-type-summary';

        const schemaBadge = createPrimitiveValue(entry.schema);
        schemaBadge.classList.add('feature-type-summary__schema');
        container.appendChild(schemaBadge);

        container.appendChild(createFeatureTypeButton(entry.schema, entry.name, entry.name));
        return container;
    }

    function createMetaChip(label, value) {
        const chip = document.createElement('span');
        chip.className = 'property-meta__chip';

        if (typeof value === 'boolean') {
            chip.classList.add(value ? 'property-meta__chip--boolean-true' : 'property-meta__chip--boolean-false');
        }

        const labelSpan = document.createElement('span');
        labelSpan.className = 'property-meta__chip-label';
        labelSpan.textContent = formatDisplayLabel(label);

        const valueNode = document.createElement('span');
        valueNode.className = 'property-meta__chip-value';
        valueNode.textContent = formatValue(value);

        chip.appendChild(labelSpan);
        chip.appendChild(valueNode);
        return chip;
    }

    function createPropertyMetaGroup(dataType, repeated, scope) {
        const container = document.createElement('div');
        container.className = 'property-meta';

        if (dataType !== undefined) {
            if (isDataTypeEntry(dataType)) {
                const dataTypeElement = createDataTypeEntry(dataType, { hideChip: true, allowModal: true });
                dataTypeElement.classList.add('property-meta__data-type');
                container.appendChild(dataTypeElement);
            } else {
                const fallback = createPrimitiveValue(dataType);
                fallback.classList.add('property-meta__value');
                container.appendChild(fallback);
            }
        }

        const chips = document.createElement('div');
        chips.className = 'property-meta__chips';

        if (repeated !== undefined) {
            chips.appendChild(createPropertyMetaChip('repeated', repeated));
        }

        if (scope !== undefined) {
            chips.appendChild(createPropertyMetaChip('scope', scope));
        }

        if (chips.childElementCount > 0) {
            container.appendChild(chips);
        }

        return container;
    }

    function createPropertyMetaChip(label, value) {
        const chip = document.createElement('span');
        chip.className = 'property-meta__chip';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'property-meta__chip-label';
        labelSpan.textContent = formatDisplayLabel(label);

        const valueNode = createPrimitiveValue(value);
        valueNode.classList.add('property-meta__chip-value');

        chip.appendChild(labelSpan);
        chip.appendChild(valueNode);
        return chip;
    }

    function createKeywordEntry(entry) {
        const container = document.createElement('span');
        container.className = 'keyword-pill';

        const keywordSpan = document.createElement('span');
        keywordSpan.className = 'keyword-pill__keyword';
        keywordSpan.textContent = formatValue(entry.keyword);
        container.appendChild(keywordSpan);

        const vocabularySpan = document.createElement('span');
        vocabularySpan.className = 'keyword-pill__vocabulary';
        vocabularySpan.textContent = entry.vocabulary === undefined || entry.vocabulary === null || entry.vocabulary === ''
            ? '[-]'
            : formatVocabularyLabel(entry.vocabulary);
        container.appendChild(vocabularySpan);

        return container;
    }

    function formatVocabularyLabel(vocabulary) {
        if (vocabulary === null || vocabulary === undefined) {
            return '';
        }

        if (typeof vocabulary === 'string' || typeof vocabulary === 'number' || typeof vocabulary === 'boolean') {
            return `[${formatValue(vocabulary)}]`;
        }

        if (Array.isArray(vocabulary)) {
            return `[${vocabulary.map((item) => formatValue(item)).join(' • ')}]`;
        }

        if (typeof vocabulary === 'object') {
            const priorityKeys = ['schema', 'name', 'vocabulary'];
            const segments = [];

            priorityKeys.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(vocabulary, key) && vocabulary[key] !== undefined) {
                    segments.push(`${formatDisplayLabel(key)}: ${formatValue(vocabulary[key])}`);
                }
            });

            Object.entries(vocabulary)
                .filter(([key]) => !priorityKeys.includes(key))
                .forEach(([key, value]) => {
                    segments.push(`${formatDisplayLabel(key)}: ${formatValue(value)}`);
                });

            return segments.length > 0 ? `[${segments.join(' • ')}]` : '[—]';
        }

        return `[${String(vocabulary)}]`;
    }

    function createContactEntry(entry) {
        const container = document.createElement('span');
        container.className = 'contact-pill';

        const orderedKeys = ['organisation_name', 'individual_name', 'electronic_mail_address', 'telephone', 'role'];
        const labels = {
            organisation_name: 'Org',
            individual_name: 'Name',
            electronic_mail_address: 'Email',
            telephone: 'Tel',
            role: 'Role',
        };
        const icons = {
            organisation_name: '🏢',
            individual_name: '👤',
            electronic_mail_address: '✉',
            telephone: '📞',
            role: '⚡',
        };

        orderedKeys.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(entry, key) || entry[key] === undefined || entry[key] === null) {
                return;
            }

            const segment = document.createElement('span');
            segment.className = 'contact-pill__segment';
            segment.title = `${labels[key]}: ${formatValue(entry[key])}`;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'contact-pill__icon';
            iconSpan.textContent = icons[key] || '•';
            iconSpan.setAttribute('aria-hidden', 'true');

            const valueSpan = document.createElement('span');
            valueSpan.className = 'contact-pill__value';
            valueSpan.textContent = formatValue(entry[key]);

            segment.appendChild(iconSpan);
            segment.appendChild(valueSpan);
            container.appendChild(segment);
        });

        return container;
    }

    function createDataTypeEntry(entry, options = {}) {
        const container = document.createElement('div');
        container.className = 'data-type-entry';

        if (!options.hideChip) {
            container.appendChild(createDataTypeChip('data_type'));
        }

        const schemaValue = createDataTypePair('schema', entry.schema);
        if (entry.schema) {
            schemaValue.classList.add('data-type-entry__schema');
        }
        container.appendChild(schemaValue);

        if (entry.schema && entry.name) {
            const namePair = createDataTypePair('name', entry.name);
            const valueEl = namePair.querySelector('.data-type-entry__value');

            if (valueEl && options.allowModal) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'feature-link feature-link--inline';
                button.textContent = formatValue(entry.name);
                button.addEventListener('click', () => {
                    openCatalogModal({
                        endpoint: '/api/catalog/data-type',
                        schema: entry.schema,
                        name: entry.name,
                        label: entry.name,
                        title: `Data type: ${entry.name}`,
                        errorLabel: 'data type',
                    });
                });
                valueEl.replaceChildren(button);
            }

            container.appendChild(namePair);
        } else {
            container.appendChild(createDataTypePair('name', entry.name));
        }

        if (Object.prototype.hasOwnProperty.call(entry, 'nullable')) {
            container.appendChild(createDataTypePair('nullable', entry.nullable));
        }

        return container;
    }

    function createDataTypePair(label, value) {
        const item = document.createElement('span');
        item.className = 'data-type-entry__item';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'data-type-entry__label';
        labelSpan.textContent = formatDisplayLabel(label);

        const valueNode = createPrimitiveValue(value);
        valueNode.classList.add('data-type-entry__value');

        item.appendChild(labelSpan);
        item.appendChild(valueNode);
        return item;
    }

    function createDataTypeChip(text) {
        const chip = document.createElement('span');
        chip.className = 'data-type-entry__chip';
        chip.textContent = formatDisplayLabel(text);
        return chip;
    }

    return {
        configure,
        createMetaChip,
        createPrimitiveValue,
        createPropertyMetaGroup,
        createValueNode,
    };
})();

window.CatalogEntryRenderer = CatalogEntryRenderer;
