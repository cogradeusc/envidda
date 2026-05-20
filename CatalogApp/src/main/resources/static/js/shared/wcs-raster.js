/**
 * LENDAS Shared WCS raster helpers
 * Common raster lookup utilities for GeoRaster-based WCS visualizations.
 */

'use strict';

const WcsRaster = {

    getValueAtLatLng(georaster, lat, lng, noDataValues = new Set()) {
        const metadata = this.getRasterMetadata(georaster);
        if (!metadata || !this.isPointInsideBounds(metadata.bounds, lat, lng)) {
            return null;
        }

        const rasterPosition = this.getRasterPosition(metadata, lat, lng);
        if (!rasterPosition) {
            return null;
        }

        const value = this.readFirstBandValue(georaster, rasterPosition, metadata);
        if (!this.isValidRasterValue(value, noDataValues)) {
            return null;
        }

        return Number(value);
    },

    getRasterMetadata(georaster) {
        if (!georaster) {
            return null;
        }

        const bounds = this.getRasterBounds(georaster);
        if (!bounds) {
            return null;
        }

        const width = Number.isFinite(georaster.width)
            ? georaster.width
            : georaster.values?.[0]?.[0]?.length;
        const height = Number.isFinite(georaster.height)
            ? georaster.height
            : georaster.values?.[0]?.length;

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }

        const pixelWidth = Math.abs(georaster.pixelWidth || ((bounds.maxX - bounds.minX) / width));
        const pixelHeight = Math.abs(georaster.pixelHeight || ((bounds.maxY - bounds.minY) / height));

        if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight) || pixelWidth === 0 || pixelHeight === 0) {
            return null;
        }

        return {
            bounds,
            pixelHeight,
            pixelWidth,
            rasterHeight: height,
            rasterWidth: width,
        };
    },

    getRasterBounds(georaster) {
        const { xmin, xmax, ymin, ymax } = georaster;
        if (![xmin, xmax, ymin, ymax].every(Number.isFinite)) {
            return null;
        }

        return {
            minX: Math.min(xmin, xmax),
            maxX: Math.max(xmin, xmax),
            minY: Math.min(ymin, ymax),
            maxY: Math.max(ymin, ymax),
        };
    },

    isPointInsideBounds(bounds, lat, lng) {
        return (
            lng >= bounds.minX &&
            lng <= bounds.maxX &&
            lat >= bounds.minY &&
            lat <= bounds.maxY
        );
    },

    getRasterPosition(metadata, lat, lng) {
        const column = Math.floor((lng - metadata.bounds.minX) / metadata.pixelWidth);
        const row = Math.floor((metadata.bounds.maxY - lat) / metadata.pixelHeight);

        if (!Number.isFinite(column) || !Number.isFinite(row)) {
            return null;
        }

        return {
            column: Math.max(0, Math.min(metadata.rasterWidth - 1, column)),
            row: Math.max(0, Math.min(metadata.rasterHeight - 1, row)),
        };
    },

    readFirstBandValue(georaster, rasterPosition, metadata) {
        const firstBand = georaster.values?.[0];
        if (!firstBand) {
            return null;
        }

        if (Array.isArray(firstBand)) {
            const rowData = firstBand[rasterPosition.row];
            if (Array.isArray(rowData) || ArrayBuffer.isView(rowData)) {
                return rowData[rasterPosition.column];
            }
            if (typeof rowData === 'number' && rasterPosition.column === 0) {
                return rowData;
            }
        }

        if (ArrayBuffer.isView(firstBand)) {
            const index = rasterPosition.row * metadata.rasterWidth + rasterPosition.column;
            return firstBand[index];
        }

        return null;
    },

    isValidRasterValue(value, noDataValues) {
        return Number.isFinite(value) && !noDataValues.has(Number(value)) && value >= -999;
    }
};

window.WcsRaster = WcsRaster;
