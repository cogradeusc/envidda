document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const statusEl = document.getElementById('status');
    const resultsSection = document.getElementById('results');
    const featureModalTemplate = document.getElementById('feature-modal');
    let modalSequence = 0;
    const modalStack = [];

    CatalogDetailRenderer.configure({
        openCatalogModal: openFeatureModal,
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modalStack.length > 0) {
            closeFeatureModal(modalStack[modalStack.length - 1]);
        }
    });

    function openFeatureModal(schema, name, label, options = {}) {
        let request = { schema, name, label, ...options };
        if (schema && typeof schema === 'object') {
            request = schema;
        }

        const {
            endpoint = '/api/catalog/feature-type',
            errorLabel = 'feature type',
            title,
            schema: targetSchema,
            name: targetName,
            label: targetLabel,
        } = request;

        const modalState = createFeatureModalInstance();
        if (!modalState) {
            return;
        }

        modalState.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        modalState.modal.hidden = false;
        modalState.modal.setAttribute('aria-busy', 'true');
        modalState.title.textContent = title || `Detail: ${targetLabel || targetName}`;
        modalState.content.replaceChildren(createModalLoadingState(endpoint));
        modalState.modal.dataset.modalDepth = String(modalStack.length + 1);
        modalState.modal.style.zIndex = String(1000 + modalStack.length * 20);
        modalStack.push(modalState);
        updateModalStackState();
        document.body.classList.add('modal-open');

        modalState.closeButton?.focus();

        loadCatalogResource(endpoint, targetSchema, targetName)
            .then((data) => {
                const content = createModalResourceContent(data, request);
                modalState.content.replaceChildren(content);
            })
            .catch((error) => {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'modal__error';
                errorMessage.textContent = error.message || 'An unexpected error occurred.';
                modalState.content.replaceChildren(errorMessage);
                if (window.notifications) {
                    notifications.error(`Could not load the ${errorLabel}: ${error.message}`);
                }
            })
            .finally(() => {
                modalState.modal.removeAttribute('aria-busy');
            });
    }

    function createFeatureModalInstance() {
        if (!featureModalTemplate) {
            return null;
        }

        const modal = featureModalTemplate.cloneNode(true);
        modal.hidden = true;
        modal.id = `feature-modal-${modalSequence}`;
        modal.dataset.modalInstance = String(modalSequence);

        const title = modal.querySelector('#feature-modal-title') || modal.querySelector('.modal__header h2');
        const content = modal.querySelector('#feature-modal-content') || modal.querySelector('.modal__content');
        const closeButton = modal.querySelector('.modal__close');

        if (!(title instanceof HTMLElement) || !(content instanceof HTMLElement)) {
            return null;
        }

        title.id = `feature-modal-title-${modalSequence}`;
        content.id = `feature-modal-content-${modalSequence}`;
        modal.setAttribute('aria-labelledby', title.id);
        modal.removeAttribute('aria-busy');

        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.hasAttribute('data-modal-dismiss')) {
                closeFeatureModal(modalState);
            }
        });

        const modalState = {
            id: modalSequence++,
            modal,
            title,
            content,
            closeButton: closeButton instanceof HTMLElement ? closeButton : null,
            lastFocusedElement: null,
        };

        document.body.appendChild(modal);
        return modalState;
    }

    function updateModalStackState() {
        modalStack.forEach((modalState, index) => {
            const isTopmost = index === modalStack.length - 1;
            modalState.modal.classList.toggle('modal--stacked', !isTopmost);
            modalState.modal.dataset.modalDepth = String(index + 1);
            modalState.modal.style.zIndex = String(1000 + index * 20);

            const backdrop = modalState.modal.querySelector('.modal__backdrop');
            if (backdrop instanceof HTMLElement) {
                backdrop.style.pointerEvents = isTopmost ? 'auto' : 'none';
            }
        });
    }

    function loadCatalogResource(endpoint, schema, name) {
        if (endpoint.includes('/vocabulary')) {
            return ApiService.fetchVocabulary(schema, name);
        }
        if (endpoint.includes('/data-type')) {
            return ApiService.fetchDataType(schema, name);
        }
        return ApiService.fetchFeatureType(schema, name);
    }

    function createModalLoadingState(endpoint = '') {
        const loading = document.createElement('div');
        loading.className = 'modal__loading';
        loading.textContent = `Loading ${formatResourceKindLabel(getModalResourceKind(endpoint)).toLowerCase()}...`;
        return loading;
    }

    function createModalResourceContent(data, request = {}) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return CatalogDetailRenderer.createDataTable(data);
        }

        const wrapper = document.createElement('div');
        const resourceKind = getModalResourceKind(request.endpoint);
        wrapper.className = `modal-resource modal-resource--${resourceKind}`;

        const hero = createModalResourceHero(data, resourceKind);
        if (hero) {
            wrapper.appendChild(hero);
        }

        const detailData = removeOverviewFields(data);
        if (Object.keys(detailData).length > 0) {
            const details = document.createElement('div');
            details.className = 'modal-resource__details';

            const detailTable = CatalogDetailRenderer.createDataTable(detailData);
            detailTable.classList.add('modal-resource__table');
            details.appendChild(detailTable);
            wrapper.appendChild(details);
        }

        if (!hero && wrapper.childElementCount === 0) {
            return CatalogDetailRenderer.createDataTable(data);
        }

        return wrapper;
    }

    function getModalResourceKind(endpoint = '') {
        if (endpoint.includes('/data-type')) {
            return 'data-type';
        }
        if (endpoint.includes('/vocabulary')) {
            return 'vocabulary';
        }
        return 'feature-type';
    }

    function createModalResourceHero(data, resourceKind) {
        const hasOverview = [data.schema, data.name, data.label, data.version, data.description].some((value) => value !== undefined && value !== null && value !== '');
        if (!hasOverview) {
            return null;
        }

        const hero = document.createElement('section');
        hero.className = 'modal-resource__hero';

        const eyebrow = document.createElement('span');
        eyebrow.className = 'modal-resource__eyebrow';
        eyebrow.textContent = formatResourceKindLabel(resourceKind);
        hero.appendChild(eyebrow);

        const meta = document.createElement('div');
        meta.className = 'modal-resource__meta';

        [
            ['Schema', data.schema],
            ['Name', data.name],
            ['Label', data.label],
            ['Version', data.version],
        ].forEach(([label, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }

            const item = document.createElement('div');
            item.className = 'modal-resource__meta-item';

            const labelEl = document.createElement('span');
            labelEl.className = 'modal-resource__meta-label';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.className = 'modal-resource__meta-value';
            valueEl.textContent = String(value);

            item.appendChild(labelEl);
            item.appendChild(valueEl);
            meta.appendChild(item);
        });

        if (meta.childElementCount > 0) {
            hero.appendChild(meta);
        }

        if (data.description) {
            const description = document.createElement('p');
            description.className = 'modal-resource__lead';
            description.textContent = data.description;
            hero.appendChild(description);
        }

        const stats = createModalResourceStats(data);
        if (stats) {
            hero.appendChild(stats);
        }

        return hero;
    }

    function createModalResourceStats(data) {
        const definitions = [
            ['names', 'Names'],
            ['properties', 'Properties'],
            ['observed_properties', 'Observed properties'],
            ['keywords', 'Keywords'],
            ['documentation', 'Docs'],
            ['contacts', 'Contacts'],
        ];

        const stats = definitions
            .map(([key, label]) => {
                const value = data[key];
                if (!Array.isArray(value) || value.length === 0) {
                    return null;
                }
                return { label, value: value.length };
            })
            .filter(Boolean)
            .slice(0, 4);

        if (stats.length === 0) {
            return null;
        }

        const list = document.createElement('div');
        list.className = 'modal-resource__stats';

        stats.forEach((stat) => {
            const item = document.createElement('div');
            item.className = 'modal-resource__stat';

            const value = document.createElement('span');
            value.className = 'modal-resource__stat-value';
            value.textContent = String(stat.value);

            const label = document.createElement('span');
            label.className = 'modal-resource__stat-label';
            label.textContent = stat.label;

            item.appendChild(value);
            item.appendChild(label);
            list.appendChild(item);
        });

        return list;
    }

    function removeOverviewFields(data) {
        const detailData = { ...data };
        ['schema', 'name', 'label', 'version', 'description'].forEach((key) => {
            delete detailData[key];
        });
        return detailData;
    }

    function formatResourceKindLabel(resourceKind) {
        const labels = {
            'feature-type': 'Feature Type',
            'data-type': 'Data Type',
            vocabulary: 'Vocabulary',
        };
        return labels[resourceKind] || 'Resource';
    }

    function closeFeatureModal(modalState) {
        if (!modalState) {
            return;
        }

        const modalIndex = modalStack.indexOf(modalState);
        if (modalIndex === -1) {
            return;
        }

        modalStack.splice(modalIndex, 1);
        modalState.modal.hidden = true;
        modalState.modal.removeAttribute('aria-busy');
        modalState.content.replaceChildren();
        modalState.modal.remove();

        updateModalStackState();

        if (modalStack.length === 0) {
            document.body.classList.remove('modal-open');
        }

        if (modalState.lastFocusedElement) {
            modalState.lastFocusedElement.focus();
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const lang = formData.get('lang');
        const filterValue = (formData.get('filter') || '').trim();
        const params = new URLSearchParams();
        if (lang) {
            params.append('lang', lang);
        }
        if (filterValue) {
            params.append('filter', filterValue);
        }

        setStatus('Searching processes...', 'loading');
        renderEmptyState('Preparing results...');

        try {
            const data = await ApiService.fetchProcessTypes({
                lang,
                filter: filterValue
            });

            if (!Array.isArray(data) || data.length === 0) {
                renderEmptyState('No processes were found for the selected criteria.');
                setStatus('No results.', 'info');
                return;
            }

            renderProcessTypes(data);
            setStatus(`Found ${data.length} processes.`, 'success');
        } catch (error) {
            Logger.error('Error fetching process types:', error);
            renderEmptyState('Unable to retrieve data. Please try again later.');
            setStatus('Error retrieving processes.', 'error');
            if (window.notifications) {
                notifications.error('Error loading process types. Please try again.');
            }
        }
    });

    function setStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = `status status--${type}`;
    }

    function renderEmptyState(message) {
        resultsSection.innerHTML = `<div class="empty-state">${message}</div>`;
    }

    function renderProcessTypes(processTypes) {
        resultsSection.innerHTML = '';

        processTypes.forEach((processType, index) => {
            const card = document.createElement('article');
            card.className = 'process-card';

            const header = document.createElement('div');
            header.className = 'process-card__header';

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'process-card__toggle';
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.setAttribute('aria-controls', `process-card-body-${index}`);

            const schemaValue = processType.schema || 'No schema';
            const nameValue = processType.name || 'Unnamed';

            const title = document.createElement('span');
            title.className = 'process-card__title';
            title.textContent = schemaValue;

            const subtitle = document.createElement('span');
            subtitle.className = 'process-card__subtitle';
            subtitle.textContent = nameValue;

            const detailsLink = document.createElement('a');
            detailsLink.className = 'process-card__link';
            detailsLink.href = `/process-type.html?schema=${encodeURIComponent(schemaValue)}&name=${encodeURIComponent(nameValue)}`;
            detailsLink.textContent = 'View details';
            detailsLink.setAttribute('aria-label', `View process detail ${schemaValue} - ${nameValue}`);
            detailsLink.addEventListener('click', (e) => {
                e.stopPropagation();
            });

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
            header.appendChild(detailsLink);

            const body = document.createElement('div');
            body.className = 'process-card__body';
            body.id = `process-card-body-${index}`;
            body.hidden = true;

            body.appendChild(CatalogDetailRenderer.createDataTable(processType));

            toggleButton.addEventListener('click', () => {
                const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
                toggleButton.setAttribute('aria-expanded', String(!expanded));
                body.hidden = expanded;
                card.classList.toggle('process-card--open', !expanded);
            });

            card.appendChild(header);
            card.appendChild(body);
            resultsSection.appendChild(card);
        });
    }
});
