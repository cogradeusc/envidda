/**
 * LENDAS Shared DOM Helpers
 * Common DOM manipulation utilities used across pages
 */

'use strict';

const DomHelpers = {

    /**
     * Update a status element with message and type class
     * @param {HTMLElement} statusEl - The status DOM element
     * @param {string} message - Status message text
     * @param {string} type - Status type: 'loading', 'success', 'error', 'info'
     */
    setStatus(statusEl, message, type) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = `status status--${type}`;
    },

    /**
     * Render an empty state message into a container
     * Uses textContent for safety; supports an optional HTML detail via DOM API
     * @param {HTMLElement} container - Target container element
     * @param {string} message - Plain text message
     * @param {string} [htmlDetail] - Optional sanitized HTML detail appended as <small>
     */
    renderEmptyState(container, message, htmlDetail) {
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'empty-state';

        const text = document.createElement('span');
        text.textContent = message;
        wrapper.appendChild(text);

        if (htmlDetail) {
            const detail = document.createElement('small');
            detail.innerHTML = htmlDetail;
            wrapper.appendChild(document.createElement('br'));
            wrapper.appendChild(detail);
        }

        container.replaceChildren(wrapper);
    },

    /**
     * Create a results summary header
     * @param {string} title - Summary title
     * @param {number} count - Number of results
     * @param {string} label - Label for the count (e.g. 'CTD observations')
     * @returns {HTMLElement}
     */
    createResultsSummary(title, count, label) {
        const summary = document.createElement('div');
        summary.className = 'results-summary';

        const heading = document.createElement('h2');
        heading.textContent = title;
        summary.appendChild(heading);

        const description = document.createElement('p');
        const countStrong = document.createElement('strong');
        countStrong.textContent = String(count);
        description.append('Found ', countStrong, ` ${label}`);
        summary.appendChild(description);

        return summary;
    },

    /**
     * Unique ID counter for DOM elements
     * @private
     */
    _idCounter: 0,

    /**
     * Generate a unique ID string for DOM elements
     * @param {string} [prefix='id'] - Prefix for the ID
     * @returns {string} Unique ID string
     */
    uniqueId(prefix = 'id') {
        return `${prefix}-${++DomHelpers._idCounter}`;
    }
};
