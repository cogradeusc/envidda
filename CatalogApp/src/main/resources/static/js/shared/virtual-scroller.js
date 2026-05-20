/**
 * LENDAS Virtual Scroller Module
 * Efficient rendering of large lists using virtual scrolling
 */

'use strict';

/**
 * Virtual Scroller for large lists
 */
class VirtualScroller {
    /**
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - Container element ID
     * @param {Array} options.items - Array of items to render
     * @param {Function} options.renderItem - Function to render a single item
     * @param {number} [options.itemHeight=50] - Estimated height of each item in pixels
     * @param {number} [options.bufferItems=5] - Number of extra items to render above/below viewport
     * @param {number} [options.overscan=3] - Number of items to render outside visible area
     */
    constructor(options = {}) {
        this.containerId = options.containerId;
        this.items = options.items || [];
        this.renderItem = options.renderItem;
        this.itemHeight = options.itemHeight || 50;
        this.bufferItems = options.bufferItems || 5;
        this.overscan = options.overscan || 3;

        this.container = null;
        this.viewport = null;
        this.content = null;
        this.spacerBefore = null;
        this.spacerAfter = null;

        this.scrollTop = 0;
        this.containerHeight = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;

        this._resizeObserver = null;
        this._scrollHandler = null;
        this._itemElements = new Map();

        this._initialized = false;
    }

    /**
     * Initialize the virtual scroller
     */
    init() {
        if (this._initialized) return;

        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            Logger.error(`VirtualScroller: Container #${this.containerId} not found`);
            return;
        }

        // Create structure
        this._createStructure();

        // Get initial dimensions
        this._updateDimensions();

        // Set up listeners
        this._setupListeners();

        // Initial render
        this._render();

        this._initialized = true;
    }

    /**
     * Create DOM structure
     * @private
     */
    _createStructure() {
        this.container.innerHTML = '';
        this.container.className = 'virtual-scroller';

        // Viewport
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroller-viewport';
        this.viewport.style.overflow = 'auto';
        this.viewport.style.position = 'relative';
        this.viewport.style.height = '100%';

        // Content wrapper
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroller-content';
        this.content.style.position = 'relative';
        this.content.style.minHeight = '100%';

        // Spacers
        this.spacerBefore = document.createElement('div');
        this.spacerBefore.className = 'virtual-scroller-spacer-before';
        this.spacerBefore.style.height = '0px';

        this.spacerAfter = document.createElement('div');
        this.spacerAfter.className = 'virtual-scroller-spacer-after';
        this.spacerAfter.style.height = '0px';

        // Items container
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.className = 'virtual-scroller-items';

        this.content.appendChild(this.spacerBefore);
        this.content.appendChild(this.itemsContainer);
        this.content.appendChild(this.spacerAfter);
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
    }

    /**
     * Update container dimensions
     * @private
     */
    _updateDimensions() {
        if (!this.viewport) return;

        this.containerHeight = this.viewport.clientHeight;
        this.scrollTop = this.viewport.scrollTop;

        this._updateVisibleRange();
    }

    /**
     * Calculate visible range
     * @private
     */
    _updateVisibleRange() {
        const totalHeight = this.items.length * this.itemHeight;
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);

        let start = Math.floor(this.scrollTop / this.itemHeight);
        let end = start + visibleCount;

        // Add buffer/overscan
        start = Math.max(0, start - this.overscan);
        end = Math.min(this.items.length, end + this.overscan);

        this.visibleStart = start;
        this.visibleEnd = end;

        // Update spacers
        this.spacerBefore.style.height = `${start * this.itemHeight}px`;
        this.spacerAfter.style.height = `${Math.max(0, totalHeight - end * this.itemHeight)}px`;
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupListeners() {
        // Scroll handler with throttle
        let scrollTimeout;
        this._scrollHandler = () => {
            if (scrollTimeout) return;

            scrollTimeout = requestAnimationFrame(() => {
                this.scrollTop = this.viewport.scrollTop;
                this._updateVisibleRange();
                this._render();
                scrollTimeout = null;
            });
        };

        this.viewport.addEventListener('scroll', this._scrollHandler, { passive: true });

        // Resize observer
        this._resizeObserver = new ResizeObserver(() => {
            this._updateDimensions();
            this._render();
        });

        this._resizeObserver.observe(this.viewport);
    }

    /**
     * Render visible items
     * @private
     */
    _render() {
        if (!this.itemsContainer) return;

        // Clear container
        this.itemsContainer.innerHTML = '';

        // Render visible items
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const item = this.items[i];
            if (!item) continue;

            const itemElement = this._createItemElement(item, i);
            this.itemsContainer.appendChild(itemElement);
            this._itemElements.set(i, itemElement);
        }

        // Update content height
        const totalHeight = this.items.length * this.itemHeight;
        this.content.style.height = `${totalHeight}px`;
    }

    /**
     * Create item element
     * @private
     * @param {*} item - Item data
     * @param {number} index - Item index
     * @returns {HTMLElement}
     */
    _createItemElement(item, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'virtual-scroller-item';
        wrapper.style.position = 'absolute';
        wrapper.style.top = `${(index - this.visibleStart) * this.itemHeight}px`;
        wrapper.style.left = '0';
        wrapper.style.right = '0';
        wrapper.style.height = `${this.itemHeight}px`;
        wrapper.dataset.index = index;

        try {
            const content = this.renderItem(item, index);
            if (content instanceof HTMLElement) {
                wrapper.appendChild(content);
            } else {
                wrapper.innerHTML = String(content);
            }
        } catch (error) {
            Logger.error(`VirtualScroller: Error rendering item at index ${index}:`, error);
            wrapper.innerHTML = `<div class="error">Error rendering item</div>`;
        }

        return wrapper;
    }

    /**
     * Update items data
     * @param {Array} newItems - New items array
     */
    setItems(newItems) {
        this.items = newItems;
        this._itemElements.clear();
        this._updateDimensions();
        this._render();
    }

    /**
     * Append items to the list
     * @param {Array} items - Items to append
     */
    appendItems(items) {
        this.items = [...this.items, ...items];
        this._updateDimensions();
        this._render();
    }

    /**
     * Scroll to a specific index
     * @param {number} index
     */
    scrollToIndex(index) {
        if (!this.viewport || index < 0 || index >= this.items.length) return;

        const scrollTop = index * this.itemHeight;
        this.viewport.scrollTop = scrollTop;
    }

    /**
     * Get current scroll position (index)
     * @returns {number}
     */
    getScrollIndex() {
        return Math.floor(this.scrollTop / this.itemHeight);
    }

    /**
     * Update a specific item
     * @param {number} index
     */
    updateItem(index) {
        if (!this._itemElements.has(index)) return;

        const item = this.items[index];
        const element = this._itemElements.get(index);

        try {
            const content = this.renderItem(item, index);
            if (content instanceof HTMLElement) {
                element.replaceChildren(content);
            } else {
                element.innerHTML = String(content);
            }
        } catch (error) {
            Logger.error(`VirtualScroller: Error updating item at index ${index}:`, error);
        }
    }

    /**
     * Refresh all visible items
     */
    refresh() {
        this._render();
    }

    /**
     * Get total height
     * @returns {number}
     */
    getTotalHeight() {
        return this.items.length * this.itemHeight;
    }

    /**
     * Destroy the virtual scroller
     */
    destroy() {
        if (this._scrollHandler) {
            this.viewport?.removeEventListener('scroll', this._scrollHandler);
        }

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }

        this._itemElements.clear();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this._initialized = false;
    }
}

/**
 * Factory function for creating virtual scrollers
 * @param {Object} options - Configuration options
 * @returns {VirtualScroller}
 */
function createVirtualScroller(options) {
    const scroller = new VirtualScroller(options);
    scroller.init();
    return scroller;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VirtualScroller, createVirtualScroller };
}

// Expose to global scope for browser
window.VirtualScroller = VirtualScroller;
window.createVirtualScroller = createVirtualScroller;

