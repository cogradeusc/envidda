/**
 * LENDAS Shared Modal Manager
 * Provides open/close/dismiss functionality for modals with focus management
 */

'use strict';

const ModalManager = {

    /** @private Track the last focused element before modal open */
    _lastFocusedElement: null,

    /**
     * Open a modal dialog
     * @param {HTMLElement} modal - The modal element (with .modal class)
     * @param {Object} [options] - Options
     * @param {boolean} [options.focusClose=true] - Focus the close button on open
     */
    open(modal, options = {}) {
        if (!modal) return;

        const focusClose = options.focusClose !== false;

        this._lastFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        modal.hidden = false;
        document.body.classList.add('modal-open');

        if (focusClose) {
            const closeButton = modal.querySelector('.modal__close');
            closeButton?.focus();
        }

        // Reset scroll
        modal.scrollTop = 0;
        const modalContent = modal.querySelector('.modal__content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    },

    /**
     * Close a modal dialog and restore focus
     * @param {HTMLElement} modal - The modal element
     * @param {Object} [options] - Options
     * @param {Function} [options.onClose] - Callback after close
     */
    close(modal, options = {}) {
        if (!modal) return;

        modal.hidden = true;
        modal.removeAttribute('aria-busy');
        document.body.classList.remove('modal-open');

        if (this._lastFocusedElement) {
            this._lastFocusedElement.focus();
            this._lastFocusedElement = null;
        }

        if (options.onClose) {
            options.onClose();
        }
    },

    /**
     * Set up standard dismiss handlers for a modal:
     * - Click on [data-modal-dismiss] elements
     * - Escape key
     * @param {HTMLElement} modal - The modal element
     * @param {Function} [onDismiss] - Custom dismiss handler (default: ModalManager.close)
     */
    setupDismissHandlers(modal, onDismiss) {
        if (!modal) return;

        const dismiss = onDismiss || (() => this.close(modal));

        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.hasAttribute('data-modal-dismiss')) {
                dismiss();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.hidden) {
                dismiss();
            }
        });
    }
};
