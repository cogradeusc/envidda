/**
 * LENDAS Shared WCS UI helpers
 * Common Leaflet and selector helpers used by ROMS and WRF visualizers.
 */

'use strict';

const WcsUi = {

    populateLayerOptions(selectElement, options) {
        if (!selectElement) {
            return;
        }

        selectElement.innerHTML = '';
        options.forEach((option, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optionElement.selected = index === 0;
            selectElement.appendChild(optionElement);
        });
    },

    populateTimeOptions(selectElement, resultTime, timeSteps, fallbackLabel = 'Time') {
        if (!selectElement) {
            return;
        }

        selectElement.innerHTML = '';

        const totalSteps = Number.parseInt(timeSteps, 10);
        if (!Number.isFinite(totalSteps) || totalSteps < 1) {
            if (window.Logger?.error) {
                Logger.error('WCS: invalid time step count:', timeSteps);
            }
            return;
        }

        const baseDate = resultTime ? new Date(resultTime) : null;

        for (let step = 1; step <= totalSteps; step += 1) {
            const optionElement = document.createElement('option');
            optionElement.value = String(step);

            if (baseDate && !Number.isNaN(baseDate.getTime())) {
                const labelDate = new Date(baseDate.getTime());
                labelDate.setUTCHours(labelDate.getUTCHours() + step);
                optionElement.textContent = `${labelDate.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
            } else {
                optionElement.textContent = `${fallbackLabel} ${step}`;
            }

            optionElement.selected = step === 1;
            selectElement.appendChild(optionElement);
        }
    },

    boundsToBbox(bounds) {
        return {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };
    },

    initializeFilterMap(config) {
        const {
            mapInstance,
            mapElement,
            drawnItems,
            center = [43.0, -8.0],
            zoom = 6,
            onBboxChange
        } = config;

        if (mapInstance) {
            return { mapInstance, drawnItems };
        }

        const filterMap = L.map(mapElement).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(filterMap);

        const filterDrawnItems = new L.FeatureGroup();
        filterMap.addLayer(filterDrawnItems);

        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                rectangle: {
                    shapeOptions: {
                        color: '#3b7eff',
                        weight: 2,
                        fillOpacity: 0.2
                    }
                },
                polygon: false,
                circle: false,
                marker: false,
                polyline: false,
                circlemarker: false
            },
            edit: {
                featureGroup: filterDrawnItems,
                remove: true
            }
        });

        filterMap.addControl(drawControl);
        MapManager.addResetZoomControl(filterMap, {
            title: 'Reset Zoom',
            label: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
            labelIsHtml: true,
            getView: () => ({ center, zoom })
        });

        const notify = (bbox) => {
            if (typeof onBboxChange === 'function') {
                onBboxChange(bbox);
            }
        };

        filterMap.on(L.Draw.Event.CREATED, (event) => {
            filterDrawnItems.clearLayers();
            filterDrawnItems.addLayer(event.layer);
            notify(this.boundsToBbox(event.layer.getBounds()));
        });

        filterMap.on(L.Draw.Event.EDITED, (event) => {
            let bbox = null;
            event.layers.eachLayer((layer) => {
                bbox = this.boundsToBbox(layer.getBounds());
            });
            notify(bbox);
        });

        filterMap.on(L.Draw.Event.DELETED, () => {
            notify(null);
        });

        return {
            mapInstance: filterMap,
            drawnItems: filterDrawnItems
        };
    },

    initializeResultMap(config) {
        const {
            mapInstance,
            mapElement,
            center = [43.0, -8.0],
            zoom = 6,
            onHover,
            onMouseOut
        } = config;

        if (mapInstance) {
            return { mapInstance };
        }

        const resultMap = L.map(mapElement).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(resultMap);

        MapManager.addResetZoomControl(resultMap, {
            title: 'Reset Zoom',
            label: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
            labelIsHtml: true,
            getView: () => ({ center, zoom })
        });

        if (typeof onHover === 'function') {
            resultMap.on('mousemove', (event) => {
                onHover(event.latlng.lat, event.latlng.lng);
            });
        }

        if (typeof onMouseOut === 'function') {
            resultMap.on('mouseout', onMouseOut);
        }

        return { mapInstance: resultMap };
    }
};

window.WcsUi = WcsUi;
