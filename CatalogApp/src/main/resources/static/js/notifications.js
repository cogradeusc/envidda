/**
 * LENDAS Notification System
 * Toast notifications for user feedback
 *
 * Usage:
 *   notifications.success('Operation completed');
 *   notifications.error('Something went wrong');
 *   notifications.warning('Please check your input');
 *   notifications.info('New data available');
 *
 * With options:
 *   notifications.success('Saved!', { duration: 6000, closable: true });
 */

'use strict';

/**
 * SVG Icons for each notification type
 */
const TOAST_ICONS = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

/**
 * Default configuration
 */
const DEFAULT_OPTIONS = {
    duration: 4000,      // Duration in ms (0 = persistent)
    closable: true,      // Show close button
    action: null         // Optional action button { text: string, onClick: function }
};

/**
 * Maximum number of toasts to display simultaneously
 */
const MAX_TOASTS = 5;

/**
 * Individual Toast Notification class
 */
class Toast {
    /**
     * @param {string} message - The message to display
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {Object} options - Configuration options
     */
    constructor(message, type, options = {}) {
        this.message = message;
        this.type = type;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.element = null;
        this.progressElement = null;
        this.closeTimeout = null;
        this.isDestroyed = false;
    }

    /**
     * Create and show the toast notification
     * @returns {HTMLElement} The toast element
     */
    show() {
        this.element = this.createElement();

        // Add to container
        const container = ToastNotificationService.getContainer();
        container.appendChild(this.element);

        // Start auto-dismiss timer
        if (this.options.duration > 0) {
            this.startProgress();
            this.closeTimeout = setTimeout(() => this.hide(), this.options.duration);
        }

        // Announce to screen readers
        this.announceToScreenReader();

        return this.element;
    }

    /**
     * Create the toast DOM element
     * @returns {HTMLElement}
     */
    createElement() {
        const toast = document.createElement('div');
        toast.className = `toast toast--${this.type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', this.type === 'error' ? 'assertive' : 'polite');

        // Icon
        const icon = document.createElement('div');
        icon.className = 'toast__icon';
        icon.innerHTML = TOAST_ICONS[this.type];
        icon.setAttribute('aria-hidden', 'true');

        // Content
        const content = document.createElement('div');
        content.className = 'toast__content';

        const message = document.createElement('div');
        message.className = 'toast__message';
        message.textContent = this.message;
        content.appendChild(message);

        // Optional action button
        if (this.options.action && this.options.action.text) {
            const action = document.createElement('button');
            action.className = 'toast__action';
            action.textContent = this.options.action.text;
            action.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.options.action.onClick) {
                    this.options.action.onClick();
                }
                this.hide();
            });
            content.appendChild(action);
        }

        // Close button
        if (this.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast__close';
            closeBtn.innerHTML = TOAST_ICONS.close;
            closeBtn.setAttribute('aria-label', 'Close notification');
            closeBtn.addEventListener('click', () => this.hide());
            toast.appendChild(closeBtn);
        }

        // Progress bar for auto-dismiss
        if (this.options.duration > 0) {
            this.progressElement = document.createElement('div');
            this.progressElement.className = 'toast__progress';
            this.progressElement.style.animationDuration = `${this.options.duration}ms`;
            toast.appendChild(this.progressElement);
        }

        toast.appendChild(icon);
        toast.appendChild(content);

        return toast;
    }

    /**
     * Start the progress bar animation
     */
    startProgress() {
        if (this.progressElement) {
            // Force reflow to ensure animation starts
            void this.progressElement.offsetWidth;
        }
    }

    /**
     * Hide the toast with animation
     */
    hide() {
        if (this.isDestroyed || !this.element) return;

        // Clear timeout to prevent double hide
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
        }

        // Add exit animation class
        this.element.classList.add('toast--exit');

        // Remove from DOM after animation
        const animationDuration = 300; // Match CSS animation duration
        setTimeout(() => this.destroy(), animationDuration);
    }

    /**
     * Remove the toast from DOM and clean up
     */
    destroy() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = null;
        this.progressElement = null;
    }

    /**
     * Announce the toast to screen readers
     */
    announceToScreenReader() {
        // The aria-live attribute on the toast handles this automatically
        // Additional announcement for persistent toasts
        if (this.options.duration === 0) {
            Logger.log(`[${this.type.toUpperCase()}] ${this.message}`);
        }
    }
}

/**
 * Toast Notification Service (Singleton)
 * Manages the toast container and provides public API
 */
class ToastNotificationService {
    constructor() {
        this.container = null;
        this.toasts = [];
    }

    /**
     * Get or create the toast container
     * @returns {HTMLElement}
     */
    static getContainer() {
        let container = document.querySelector('.toast-container');

        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-label', 'Notificaciones');
            document.body.appendChild(container);
        }

        return container;
    }

    /**
     * Show a success toast
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Toast}
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show an error toast
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Toast}
     */
    error(message, options = {}) {
        // Errors persist longer by default
        const errorOptions = { duration: 6000, ...options };
        return this.show(message, 'error', errorOptions);
    }

    /**
     * Show a warning toast
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Toast}
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show an info toast
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Toast}
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Toast type
     * @param {Object} options - Configuration options
     * @returns {Toast}
     */
    show(message, type, options) {
        // Validate inputs
        if (!message || typeof message !== 'string') {
            Logger.warn('Notification message must be a non-empty string');
            return null;
        }

        // Remove oldest toast if at max capacity
        if (this.toasts.length >= MAX_TOASTS) {
            const oldestToast = this.toasts[0];
            if (oldestToast) {
                oldestToast.hide();
            }
        }

        // Create and show new toast
        const toast = new Toast(message, type, options);
        toast.show();

        // Track the toast
        this.toasts.push(toast);

        // Clean up reference when toast is hidden
        const originalDestroy = toast.destroy.bind(toast);
        toast.destroy = () => {
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
            originalDestroy();
        };

        return toast;
    }

    /**
     * Clear all active toasts
     */
    clearAll() {
        // Create a copy since hide() modifies the array
        [...this.toasts].forEach(toast => toast.hide());
    }

    /**
     * Get the number of active toasts
     * @returns {number}
     */
    get activeCount() {
        return this.toasts.length;
    }
}

// Create global singleton instance
const notifications = new ToastNotificationService();

// Expose to global scope for browser console access and inline scripts
window.notifications = notifications;

// Also export for module systems (if applicable)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { notifications, Toast, ToastNotificationService };
}

