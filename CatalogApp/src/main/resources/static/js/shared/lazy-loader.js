/**
 * LENDAS Lazy Loading Module
 * Lazy loading for maps and heavy components using Intersection Observer
 */

'use strict';

/**
 * Lazy Loader utility for delaying initialization until needed
 */
const LazyLoader = {
    /**
     * Map instance tracking
     * @private
     */
    _mapInstances: new Map(),

    /**
     * Intersection Observer instances
     * @private
     */
    _observers: new Map(),

    /**
     * Default options
     * @private
     */
    _defaultOptions: {
        rootMargin: '100px',
        threshold: 0.01
    },

    /**
     * Create a lazy loading placeholder for a map
     * @param {string} containerId - Container element ID
     * @param {Object} options - Configuration options
     * @param {string} [options.placeholderText='Loading map...'] - Placeholder text
     * @param {string} [options.loadingClass='map-loading'] - CSS class for loading state
     * @param {Function} options.initMap - Function to initialize the map
     * @returns {Object} Lazy loading controller
     */
    createLazyMap(containerId, options = {}) {
        const {
            placeholderText = 'Loading map...',
            loadingClass = 'map-loading',
            initMap
        } = options;

        if (!initMap || typeof initMap !== 'function') {
            throw new Error('initMap function is required');
        }

        const container = document.getElementById(containerId);
        if (!container) {
            Logger.warn(`Map container #${containerId} not found`);
            return null;
        }

        // Create placeholder UI
        const placeholder = this._createMapPlaceholder(containerId, placeholderText, loadingClass);
        container.appendChild(placeholder);

        // Store initialization data
        const mapData = {
            container,
            placeholder,
            initMap,
            initialized: false,
            loadingClass
        };
        this._mapInstances.set(containerId, mapData);

        // Set up Intersection Observer
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !mapData.initialized) {
                        this._initializeMap(containerId);
                    }
                });
            },
            { ...this._defaultOptions, ...options.observerOptions }
        );

        observer.observe(container);
        this._observers.set(containerId, observer);

        // Return controller
        return {
            load: () => this._initializeMap(containerId),
            cancel: () => this._cancelLazyLoad(containerId),
            isLoaded: () => this._mapInstances.get(containerId)?.initialized || false
        };
    },

    /**
     * Create map placeholder element
     * @private
     * @param {string} containerId
     * @param {string} text
     * @param {string} loadingClass
     * @returns {HTMLElement}
     */
    _createMapPlaceholder(containerId, text, loadingClass) {
        const placeholder = document.createElement('div');
        placeholder.className = 'map-placeholder';
        placeholder.setAttribute('data-lazy-placeholder', containerId);
        placeholder.innerHTML = `
            <div class="map-placeholder-content ${loadingClass}">
                <div class="map-placeholder-spinner"></div>
                <span class="map-placeholder-text">${text}</span>
            </div>
        `;
        return placeholder;
    },

    /**
     * Initialize the map
     * @private
     * @param {string} containerId
     */
    _initializeMap(containerId) {
        const mapData = this._mapInstances.get(containerId);
        if (!mapData || mapData.initialized) {
            return;
        }

        mapData.initialized = true;

        // Remove placeholder
        if (mapData.placeholder && mapData.placeholder.parentNode) {
            mapData.placeholder.parentNode.removeChild(mapData.placeholder);
        }

        // Initialize map
        try {
            mapData.initMap(mapData.container);

            // Remove observer
            const observer = this._observers.get(containerId);
            if (observer) {
                observer.disconnect();
                this._observers.delete(containerId);
            }
        } catch (error) {
            Logger.error(`Error initializing map #${containerId}:`, error);
            this._showError(containerId, error);
        }
    },

    /**
     * Show error in placeholder
     * @private
     * @param {string} containerId
     * @param {Error} error
     */
    _showError(containerId, _error) {
        const mapData = this._mapInstances.get(containerId);
        if (!mapData) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'map-placeholder-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">Error loading map</span>
                <button type="button" class="error-retry" data-retry-map="${containerId}">
                    Reintentar
                </button>
            </div>
        `;

        if (mapData.placeholder && mapData.placeholder.parentNode) {
            mapData.placeholder.parentNode.replaceChild(errorDiv, mapData.placeholder);
        }

        // Add retry handler
        errorDiv.querySelector('[data-retry-map]')?.addEventListener('click', () => {
            mapData.initialized = false;
            this._initializeMap(containerId);
        });
    },

    /**
     * Cancel lazy loading for a map
     * @param {string} containerId
     */
    _cancelLazyLoad(containerId) {
        const observer = this._observers.get(containerId);
        if (observer) {
            observer.disconnect();
            this._observers.delete(containerId);
        }
        this._mapInstances.delete(containerId);
    },

    /**
     * Force load all lazy maps
     */
    loadAllMaps() {
        this._mapInstances.forEach((_, containerId) => {
            this._initializeMap(containerId);
        });
    },

    /**
     * Create a lazy loading wrapper for any component
     * @param {string} containerId - Container element ID
     * @param {Function} initFunction - Function to initialize the component
     * @param {Object} options - Configuration options
     * @returns {Object} Lazy loading controller
     */
    createLazyComponent(containerId, initFunction, options = {}) {
        const {
            placeholder = null,
            rootMargin = '200px',
            threshold = 0.01
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            Logger.warn(`Container #${containerId} not found`);
            return null;
        }

        let initialized = false;

        // Add placeholder if provided
        if (placeholder) {
            container.innerHTML = placeholder;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !initialized) {
                        initialized = true;
                        try {
                            initFunction(container);
                            observer.disconnect();
                        } catch (error) {
                            Logger.error(`Error initializing component #${containerId}:`, error);
                        }
                    }
                });
            },
            { rootMargin, threshold }
        );

        observer.observe(container);

        return {
            load: () => {
                if (!initialized) {
                    initialized = true;
                    initFunction(container);
                    observer.disconnect();
                }
            },
            cancel: () => observer.disconnect(),
            isLoaded: () => initialized
        };
    },

    /**
     * Lazy load images using native loading attribute or Intersection Observer
     * @param {string} selector - CSS selector for images
     * @param {Object} options - Options
     */
    lazyLoadImages(selector = 'img[data-src]', options = {}) {
        const { useNative = true, rootMargin = '50px', threshold = 0.01 } = options;

        // Check for native lazy loading support
        if ('loading' in HTMLImageElement.prototype && useNative) {
            document.querySelectorAll(selector).forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.loading = 'lazy';
                }
            });
            return;
        }

        // Fallback to Intersection Observer
        const imageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            },
            { rootMargin, threshold }
        );

        document.querySelectorAll(selector).forEach(img => {
            imageObserver.observe(img);
        });
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LazyLoader };
}

// Expose to global scope for browser
window.LazyLoader = LazyLoader;

