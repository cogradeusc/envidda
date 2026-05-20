/**
 * Translation data for supported language codes.
 * The static frontend is rendered in English; legacy language codes map to English for compatibility.
 * @private
 */
const TRANSLATIONS = {
    spa: {
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.reset': 'Reset',
        'common.apply': 'Apply',
        'common.show': 'Show',
        'common.hide': 'Hide',
        'common.more': 'More',
        'common.less': 'Less',
        'common.all': 'All',
        'common.none': 'None',
        'common.select': 'Select',
        'common.selected': 'Selected',
        'common.noData': 'No data',
        'common.noResults': 'No results found',
        'common.tryAgain': 'Try again',
        'common.retry': 'Retry',
        'common.download': 'Download',
        'common.export': 'Export',
        'common.print': 'Print',
        'common.share': 'Share',
        'common.copy': 'Copy',
        'common.copied': 'Copied',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.add': 'Add',
        'common.remove': 'Remove',
        'common.confirm': 'Confirm',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.ok': 'OK',
        'common.or': 'or',
        'common.and': 'and',
        'common.to': 'to',
        'common.from': 'from',
        'common.at': 'at',
        'common.on': 'on',
        'common.in': 'in',
        'common.with': 'with',
        'common.without': 'without',

        // Navigation
        'nav.home': 'Home',
        'nav.catalog': 'Catalog',
        'nav.processes': 'Processes',
        'nav.data': 'Data',
        'nav.map': 'Map',
        'nav.charts': 'Charts',
        'nav.settings': 'Settings',
        'nav.help': 'Help',
        'nav.about': 'About',
        'nav.contact': 'Contact',
        'nav.logout': 'Logout',
        'nav.login': 'Login',

        // Form labels
        'form.startDate': 'Start date',
        'form.endDate': 'End date',
        'form.dateRange': 'Date range',
        'form.procedures': 'Procedures',
        'form.procedure': 'Procedure',
        'form.bbox': 'Geographic area (BBOX)',
        'form.clearBbox': 'Clear BBOX',
        'form.language': 'Language',
        'form.filter': 'Filter',
        'form.search': 'Search',
        'form.required': 'Required field',
        'form.optional': 'Optional',
        'form.invalid': 'Invalid value',

        // Languages
        'lang.spa': 'Spanish',
        'lang.glg': 'Galician',
        'lang.eng': 'English',

        // Status messages
        'status.loading': 'Loading...',
        'status.loadingData': 'Loading data...',
        'status.saving': 'Saving...',
        'status.processing': 'Processing...',
        'status.searching': 'Searching...',
        'status.error': 'An error occurred',
        'status.errorLoading': 'Error loading data',
        'status.errorSaving': 'Error saving',
        'status.success': 'Operation completed',
        'status.saved': 'Saved successfully',
        'status.deleted': 'Deleted successfully',
        'status.noData': 'No data available',
        'status.noResults': 'No results found',
        'status.tryAgain': 'Please try again later',
        'status.noSelection': 'No area selected',
        'status.areaSelected': 'Area selected',

        // Map
        'map.title': 'Map',
        'map.zoomIn': 'Zoom in',
        'map.zoomOut': 'Zoom out',
        'map.layers': 'Layers',
        'map.basemap': 'Basemap',
        'map.draw': 'Draw',
        'map.drawRectangle': 'Draw rectangle',
        'map.edit': 'Edit',
        'map.delete': 'Delete',
        'map.clear': 'Clear',
        'map.clearAll': 'Clear all',
        'map.selectArea': 'Select area',
        'map.selectedArea': 'Selected area',

        // Results
        'results.title': 'Results',
        'results.found': 'Found {count} results',
        'results.showing': 'Showing {showing} of {total}',
        'results.page': 'Page {current} of {total}',
        'results.next': 'Next',
        'results.previous': 'Previous',
        'results.first': 'First',
        'results.last': 'Last',
        'results.perPage': 'per page',
        'results.sortBy': 'Sort by',
        'results.order': 'Order',
        'results.ascending': 'Ascending',
        'results.descending': 'Descending',
        'results.exportCSV': 'Export to CSV',

        // Availability
        'availability.title': 'Data availability',
        'availability.periods': 'Periods',
        'availability.period': 'Period',
        'availability.observations': 'Observations',
        'availability.observation': 'Observation',
        'availability.start': 'Start',
        'availability.end': 'End',
        'availability.duration': 'Duration',
        'availability.resolution': 'Resolution',
        'availability.totalObservations': 'Total observations',
        'availability.noPeriods': 'No periods available',
        'availability.timeRange': 'Time range',

        // Charts
        'charts.title': 'Charts',
        'charts.viewChart': 'View chart',
        'charts.downloadChart': 'Download chart',
        'charts.variables': 'Variables',
        'charts.selectAll': 'Select all',
        'charts.deselectAll': 'Deselect all',
        'charts.noData': 'No data to display',

        // Modal
        'modal.close': 'Close',
        'modal.closeAria': 'Close modal',
        'modal.back': 'Back',
        'modal.loading': 'Loading...',
        'modal.error': 'Error loading',

        // Process types
        'process.schema': 'Schema',
        'process.name': 'Name',
        'process.description': 'Description',
        'process.label': 'Label',
        'process.version': 'Version',
        'process.keywords': 'Keywords',
        'process.contacts': 'Contacts',
        'process.documentation': 'Documentation',
        'process.lineage': 'Lineage',
        'process.configuration': 'Configuration',
        'process.parameters': 'Parameters',
        'process.observedProperties': 'Observed properties',
        'process.featureOfInterest': 'Feature of Interest',
        'process.dataType': 'Data type',
        'process.resultTime': 'Result time',
        'process.phenomenonTime': 'Phenomenon time',
        'process.validTime': 'Valid time',
        'process.resultQuality': 'Result quality',
        'process.procedure': 'Procedure',
        'process.viewDetail': 'View detail',
        'process.backToProcess': 'Back to process',

        // CTD specific
        'ctd.title': 'CTD Data Query',
        'ctd.search': 'Search CTD data',
        'ctd.depthProfile': 'Depth profile',
        'ctd.temperature': 'Temperature',
        'ctd.salinity': 'Salinity',
        'ctd.pressure': 'Pressure',
        'ctd.conductivity': 'Conductivity',
        'ctd.density': 'Density',
        'ctd.oxygen': 'Oxygen',
        'ctd.fluorescence': 'Fluorescence',
        'ctd.turbidity': 'Turbidity',
        'ctd.ph': 'pH',

        // WRF specific
        'wrf.title': 'WRF Data Query',
        'wrf.search': 'Search WRF data',
        'wrf.windDirection': 'Wind direction',
        'wrf.windSpeed': 'Wind speed',
        'wrf.pressure': 'Pressure',
        'wrf.precipitation': 'Precipitation',
        'wrf.relativeHumidity': 'Relative humidity',
        'wrf.snowAmount': 'Snow (amount)',
        'wrf.snowDepth': 'Snow (depth)',
        'wrf.seaSurfaceTemperature': 'Sea surface temperature',
        'wrf.airTemperature': 'Air temperature',
        'wrf.variable': 'Variable',
        'wrf.hour': 'Hour',

        // ROMS specific
        'roms.title': 'ROMS Data Query',
        'roms.search': 'Search ROMS data',
        'roms.salinity': 'Salinity',
        'roms.potentialTemperature': 'Potential temperature',
        'roms.velocityU': 'Velocity U',
        'roms.velocityV': 'Velocity V',
        'roms.seaSurfaceHeight': 'Sea surface height',
        'roms.depth': 'Depth',
        'roms.surface': 'Surface',

        // Vessel specific
        'vessel.title': 'Vessel Data Query',
        'vessel.search': 'Search vessel data',
        'vessel.speed': 'Speed',
        'vessel.heading': 'Heading',
        'vessel.course': 'Course over ground',
        'vessel.position': 'Position',
        'vessel.track': 'Track',

        // Meteostations specific
        'meteo.title': 'Meteorological Stations',
        'meteo.search': 'Search meteorological data',
        'meteo.temperature': 'Temperature',
        'meteo.humidity': 'Humidity',
        'meteo.pressure': 'Pressure',
        'meteo.wind': 'Wind',
        'meteo.precipitation': 'Precipitation',
        'meteo.radiation': 'Radiation',
        'meteo.snow': 'Snow',
        'meteo.station': 'Station',

        // Air quality specific
        'airquality.title': 'Air Quality',
        'airquality.search': 'Search air quality data',
        'airquality.pm25': 'PM2.5',
        'airquality.pm10': 'PM10',
        'airquality.no2': 'NO₂',
        'airquality.o3': 'O₃',
        'airquality.so2': 'SO₂',
        'airquality.co': 'CO',

        // Radiosounding specific
        'radio.title': 'Radiosounding',
        'radio.search': 'Search radiosounding data',
        'radio.skewT': 'Skew-T Diagram',
        'radio.hodograph': 'Hodograph',
        'radio.stuve': 'Stüve Diagram',
        'radio.tephigram': 'Tephigram',

        // Traffic specific
        'traffic.title': 'Traffic',
        'traffic.search': 'Search traffic data',
        'traffic.sensors': 'Sensors',
        'traffic.flow': 'Flow',
        'traffic.speed': 'Speed',
        'traffic.density': 'Density',

        // Empty states
        'empty.noData': 'No data to display',
        'empty.noResults': 'No results found for the selected criteria',
        'empty.configureFilters': 'Configure filters and press "{button}" to get results',
        'empty.tryAgain': 'Unable to retrieve data. Please try again later.',
        'empty.loading': 'Preparing results...',
        'empty.selectArea': 'Draw a rectangle on the map',
        'empty.noPeriods': 'No periods available',

        // Errors
        'error.generic': 'An error occurred',
        'error.loading': 'Error loading data',
        'error.processing': 'Error processing request',
        'error.network': 'Connection error',
        'error.timeout': 'Request timeout',
        'error.notFound': 'Not found',
        'error.unauthorized': 'Unauthorized',
        'error.forbidden': 'Access denied',
        'error.validation': 'Validation error',
        'error.server': 'Server error',
        'error.unknown': 'Unknown error',
        'error.retry': 'Please try again',

        // Notifications
        'notify.errorLoading': 'Error loading data',
        'notify.errorProcessTypes': 'Error loading process types',
        'notify.noResults': 'No results found',
        'notify.selectProcedure': 'Please enter a procedure',
        'notify.selectDates': 'Please select start and end dates',
    },
    glg: {
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.reset': 'Reset',
        'common.apply': 'Apply',
        'common.show': 'Show',
        'common.hide': 'Hide',
        'common.more': 'More',
        'common.less': 'Less',
        'common.all': 'All',
        'common.none': 'None',
        'common.select': 'Select',
        'common.selected': 'Selected',
        'common.noData': 'No data',
        'common.noResults': 'No results found',
        'common.tryAgain': 'Try again',
        'common.retry': 'Retry',
        'common.download': 'Download',
        'common.export': 'Export',
        'common.print': 'Print',
        'common.share': 'Share',
        'common.copy': 'Copy',
        'common.copied': 'Copied',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.add': 'Add',
        'common.remove': 'Remove',
        'common.confirm': 'Confirm',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.ok': 'OK',
        'common.or': 'or',
        'common.and': 'and',
        'common.to': 'to',
        'common.from': 'from',
        'common.at': 'at',
        'common.on': 'on',
        'common.in': 'in',
        'common.with': 'with',
        'common.without': 'without',

        // Navigation
        'nav.home': 'Home',
        'nav.catalog': 'Catalog',
        'nav.processes': 'Processes',
        'nav.data': 'Data',
        'nav.map': 'Map',
        'nav.charts': 'Charts',
        'nav.settings': 'Settings',
        'nav.help': 'Help',
        'nav.about': 'About',
        'nav.contact': 'Contact',
        'nav.logout': 'Logout',
        'nav.login': 'Login',

        // Form labels
        'form.startDate': 'Start date',
        'form.endDate': 'End date',
        'form.dateRange': 'Date range',
        'form.procedures': 'Procedures',
        'form.procedure': 'Procedure',
        'form.bbox': 'Geographic area (BBOX)',
        'form.clearBbox': 'Clear BBOX',
        'form.language': 'Language',
        'form.filter': 'Filter',
        'form.search': 'Search',
        'form.required': 'Required field',
        'form.optional': 'Optional',
        'form.invalid': 'Invalid value',

        // Languages
        'lang.spa': 'Spanish',
        'lang.glg': 'Galician',
        'lang.eng': 'English',

        // Status messages
        'status.loading': 'Loading...',
        'status.loadingData': 'Loading data...',
        'status.saving': 'Saving...',
        'status.processing': 'Processing...',
        'status.searching': 'Searching...',
        'status.error': 'An error occurred',
        'status.errorLoading': 'Error loading data',
        'status.errorSaving': 'Error saving',
        'status.success': 'Operation completed',
        'status.saved': 'Saved successfully',
        'status.deleted': 'Deleted successfully',
        'status.noData': 'No data available',
        'status.noResults': 'No results found',
        'status.tryAgain': 'Please try again later',
        'status.noSelection': 'No area selected',
        'status.areaSelected': 'Area selected',

        // Map
        'map.title': 'Map',
        'map.zoomIn': 'Zoom in',
        'map.zoomOut': 'Zoom out',
        'map.layers': 'Layers',
        'map.basemap': 'Basemap',
        'map.draw': 'Draw',
        'map.drawRectangle': 'Draw rectangle',
        'map.edit': 'Edit',
        'map.delete': 'Delete',
        'map.clear': 'Clear',
        'map.clearAll': 'Clear all',
        'map.selectArea': 'Select area',
        'map.selectedArea': 'Selected area',

        // Results
        'results.title': 'Results',
        'results.found': 'Found {count} results',
        'results.showing': 'Showing {showing} of {total}',
        'results.page': 'Page {current} of {total}',
        'results.next': 'Next',
        'results.previous': 'Previous',
        'results.first': 'First',
        'results.last': 'Last',
        'results.perPage': 'per page',
        'results.sortBy': 'Sort by',
        'results.order': 'Order',
        'results.ascending': 'Ascending',
        'results.descending': 'Descending',
        'results.exportCSV': 'Export to CSV',

        // Availability
        'availability.title': 'Data availability',
        'availability.periods': 'Periods',
        'availability.period': 'Period',
        'availability.observations': 'Observations',
        'availability.observation': 'Observation',
        'availability.start': 'Start',
        'availability.end': 'End',
        'availability.duration': 'Duration',
        'availability.resolution': 'Resolution',
        'availability.totalObservations': 'Total observations',
        'availability.noPeriods': 'No periods available',
        'availability.timeRange': 'Time range',

        // Charts
        'charts.title': 'Charts',
        'charts.viewChart': 'View chart',
        'charts.downloadChart': 'Download chart',
        'charts.variables': 'Variables',
        'charts.selectAll': 'Select all',
        'charts.deselectAll': 'Deselect all',
        'charts.noData': 'No data to display',

        // Modal
        'modal.close': 'Close',
        'modal.closeAria': 'Close modal',
        'modal.back': 'Back',
        'modal.loading': 'Loading...',
        'modal.error': 'Error loading',

        // Process types
        'process.schema': 'Schema',
        'process.name': 'Name',
        'process.description': 'Description',
        'process.label': 'Label',
        'process.version': 'Version',
        'process.keywords': 'Keywords',
        'process.contacts': 'Contacts',
        'process.documentation': 'Documentation',
        'process.lineage': 'Lineage',
        'process.configuration': 'Configuration',
        'process.parameters': 'Parameters',
        'process.observedProperties': 'Observed properties',
        'process.featureOfInterest': 'Feature of Interest',
        'process.dataType': 'Data type',
        'process.resultTime': 'Result time',
        'process.phenomenonTime': 'Phenomenon time',
        'process.validTime': 'Valid time',
        'process.resultQuality': 'Result quality',
        'process.procedure': 'Procedure',
        'process.viewDetail': 'View detail',
        'process.backToProcess': 'Back to process',

        // CTD specific
        'ctd.title': 'CTD Data Query',
        'ctd.search': 'Search CTD data',
        'ctd.depthProfile': 'Depth profile',
        'ctd.temperature': 'Temperature',
        'ctd.salinity': 'Salinity',
        'ctd.pressure': 'Pressure',
        'ctd.conductivity': 'Conductivity',
        'ctd.density': 'Density',
        'ctd.oxygen': 'Oxygen',
        'ctd.fluorescence': 'Fluorescence',
        'ctd.turbidity': 'Turbidity',
        'ctd.ph': 'pH',

        // WRF specific
        'wrf.title': 'WRF Data Query',
        'wrf.search': 'Search WRF data',
        'wrf.windDirection': 'Wind direction',
        'wrf.windSpeed': 'Wind speed',
        'wrf.pressure': 'Pressure',
        'wrf.precipitation': 'Precipitation',
        'wrf.relativeHumidity': 'Relative humidity',
        'wrf.snowAmount': 'Snow (amount)',
        'wrf.snowDepth': 'Snow (depth)',
        'wrf.seaSurfaceTemperature': 'Sea surface temperature',
        'wrf.airTemperature': 'Air temperature',
        'wrf.variable': 'Variable',
        'wrf.hour': 'Hour',

        // ROMS specific
        'roms.title': 'ROMS Data Query',
        'roms.search': 'Search ROMS data',
        'roms.salinity': 'Salinity',
        'roms.potentialTemperature': 'Potential temperature',
        'roms.velocityU': 'Velocity U',
        'roms.velocityV': 'Velocity V',
        'roms.seaSurfaceHeight': 'Sea surface height',
        'roms.depth': 'Depth',
        'roms.surface': 'Surface',

        // Vessel specific
        'vessel.title': 'Vessel Data Query',
        'vessel.search': 'Search vessel data',
        'vessel.speed': 'Speed',
        'vessel.heading': 'Heading',
        'vessel.course': 'Course over ground',
        'vessel.position': 'Position',
        'vessel.track': 'Track',

        // Meteostations specific
        'meteo.title': 'Meteorological Stations',
        'meteo.search': 'Search meteorological data',
        'meteo.temperature': 'Temperature',
        'meteo.humidity': 'Humidity',
        'meteo.pressure': 'Pressure',
        'meteo.wind': 'Wind',
        'meteo.precipitation': 'Precipitation',
        'meteo.radiation': 'Radiation',
        'meteo.snow': 'Snow',
        'meteo.station': 'Station',

        // Air quality specific
        'airquality.title': 'Air Quality',
        'airquality.search': 'Search air quality data',
        'airquality.pm25': 'PM2.5',
        'airquality.pm10': 'PM10',
        'airquality.no2': 'NO₂',
        'airquality.o3': 'O₃',
        'airquality.so2': 'SO₂',
        'airquality.co': 'CO',

        // Radiosounding specific
        'radio.title': 'Radiosounding',
        'radio.search': 'Search radiosounding data',
        'radio.skewT': 'Skew-T Diagram',
        'radio.hodograph': 'Hodograph',
        'radio.stuve': 'Stüve Diagram',
        'radio.tephigram': 'Tephigram',

        // Traffic specific
        'traffic.title': 'Traffic',
        'traffic.search': 'Search traffic data',
        'traffic.sensors': 'Sensors',
        'traffic.flow': 'Flow',
        'traffic.speed': 'Speed',
        'traffic.density': 'Density',

        // Empty states
        'empty.noData': 'No data to display',
        'empty.noResults': 'No results found for the selected criteria',
        'empty.configureFilters': 'Configure filters and press "{button}" to get results',
        'empty.tryAgain': 'Unable to retrieve data. Please try again later.',
        'empty.loading': 'Preparing results...',
        'empty.selectArea': 'Draw a rectangle on the map',
        'empty.noPeriods': 'No periods available',

        // Errors
        'error.generic': 'An error occurred',
        'error.loading': 'Error loading data',
        'error.processing': 'Error processing request',
        'error.network': 'Connection error',
        'error.timeout': 'Request timeout',
        'error.notFound': 'Not found',
        'error.unauthorized': 'Unauthorized',
        'error.forbidden': 'Access denied',
        'error.validation': 'Validation error',
        'error.server': 'Server error',
        'error.unknown': 'Unknown error',
        'error.retry': 'Please try again',

        // Notifications
        'notify.errorLoading': 'Error loading data',
        'notify.errorProcessTypes': 'Error loading process types',
        'notify.noResults': 'No results found',
        'notify.selectProcedure': 'Please enter a procedure',
        'notify.selectDates': 'Please select start and end dates',
    },
    eng: {
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.reset': 'Reset',
        'common.apply': 'Apply',
        'common.show': 'Show',
        'common.hide': 'Hide',
        'common.more': 'More',
        'common.less': 'Less',
        'common.all': 'All',
        'common.none': 'None',
        'common.select': 'Select',
        'common.selected': 'Selected',
        'common.noData': 'No data',
        'common.noResults': 'No results found',
        'common.tryAgain': 'Try again',
        'common.retry': 'Retry',
        'common.download': 'Download',
        'common.export': 'Export',
        'common.print': 'Print',
        'common.share': 'Share',
        'common.copy': 'Copy',
        'common.copied': 'Copied',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.add': 'Add',
        'common.remove': 'Remove',
        'common.confirm': 'Confirm',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.ok': 'OK',
        'common.or': 'or',
        'common.and': 'and',
        'common.to': 'to',
        'common.from': 'from',
        'common.at': 'at',
        'common.on': 'on',
        'common.in': 'in',
        'common.with': 'with',
        'common.without': 'without',

        // Navigation
        'nav.home': 'Home',
        'nav.catalog': 'Catalog',
        'nav.processes': 'Processes',
        'nav.data': 'Data',
        'nav.map': 'Map',
        'nav.charts': 'Charts',
        'nav.settings': 'Settings',
        'nav.help': 'Help',
        'nav.about': 'About',
        'nav.contact': 'Contact',
        'nav.logout': 'Logout',
        'nav.login': 'Login',

        // Form labels
        'form.startDate': 'Start date',
        'form.endDate': 'End date',
        'form.dateRange': 'Date range',
        'form.procedures': 'Procedures',
        'form.procedure': 'Procedure',
        'form.bbox': 'Geographic area (BBOX)',
        'form.clearBbox': 'Clear BBOX',
        'form.language': 'Language',
        'form.filter': 'Filter',
        'form.search': 'Search',
        'form.required': 'Required field',
        'form.optional': 'Optional',
        'form.invalid': 'Invalid value',

        // Languages
        'lang.spa': 'Spanish',
        'lang.glg': 'Galician',
        'lang.eng': 'English',

        // Status messages
        'status.loading': 'Loading...',
        'status.loadingData': 'Loading data...',
        'status.saving': 'Saving...',
        'status.processing': 'Processing...',
        'status.searching': 'Searching...',
        'status.error': 'An error occurred',
        'status.errorLoading': 'Error loading data',
        'status.errorSaving': 'Error saving',
        'status.success': 'Operation completed',
        'status.saved': 'Saved successfully',
        'status.deleted': 'Deleted successfully',
        'status.noData': 'No data available',
        'status.noResults': 'No results found',
        'status.tryAgain': 'Please try again later',
        'status.noSelection': 'No area selected',
        'status.areaSelected': 'Area selected',

        // Map
        'map.title': 'Map',
        'map.zoomIn': 'Zoom in',
        'map.zoomOut': 'Zoom out',
        'map.layers': 'Layers',
        'map.basemap': 'Basemap',
        'map.draw': 'Draw',
        'map.drawRectangle': 'Draw rectangle',
        'map.edit': 'Edit',
        'map.delete': 'Delete',
        'map.clear': 'Clear',
        'map.clearAll': 'Clear all',
        'map.selectArea': 'Select area',
        'map.selectedArea': 'Selected area',

        // Results
        'results.title': 'Results',
        'results.found': 'Found {count} results',
        'results.showing': 'Showing {showing} of {total}',
        'results.page': 'Page {current} of {total}',
        'results.next': 'Next',
        'results.previous': 'Previous',
        'results.first': 'First',
        'results.last': 'Last',
        'results.perPage': 'per page',
        'results.sortBy': 'Sort by',
        'results.order': 'Order',
        'results.ascending': 'Ascending',
        'results.descending': 'Descending',
        'results.exportCSV': 'Export to CSV',

        // Availability
        'availability.title': 'Data availability',
        'availability.periods': 'Periods',
        'availability.period': 'Period',
        'availability.observations': 'Observations',
        'availability.observation': 'Observation',
        'availability.start': 'Start',
        'availability.end': 'End',
        'availability.duration': 'Duration',
        'availability.resolution': 'Resolution',
        'availability.totalObservations': 'Total observations',
        'availability.noPeriods': 'No periods available',
        'availability.timeRange': 'Time range',

        // Charts
        'charts.title': 'Charts',
        'charts.viewChart': 'View chart',
        'charts.downloadChart': 'Download chart',
        'charts.variables': 'Variables',
        'charts.selectAll': 'Select all',
        'charts.deselectAll': 'Deselect all',
        'charts.noData': 'No data to display',

        // Modal
        'modal.close': 'Close',
        'modal.closeAria': 'Close modal',
        'modal.back': 'Back',
        'modal.loading': 'Loading...',
        'modal.error': 'Error loading',

        // Process types
        'process.schema': 'Schema',
        'process.name': 'Name',
        'process.description': 'Description',
        'process.label': 'Label',
        'process.version': 'Version',
        'process.keywords': 'Keywords',
        'process.contacts': 'Contacts',
        'process.documentation': 'Documentation',
        'process.lineage': 'Lineage',
        'process.configuration': 'Configuration',
        'process.parameters': 'Parameters',
        'process.observedProperties': 'Observed properties',
        'process.featureOfInterest': 'Feature of Interest',
        'process.dataType': 'Data type',
        'process.resultTime': 'Result time',
        'process.phenomenonTime': 'Phenomenon time',
        'process.validTime': 'Valid time',
        'process.resultQuality': 'Result quality',
        'process.procedure': 'Procedure',
        'process.viewDetail': 'View detail',
        'process.backToProcess': 'Back to process',

        // CTD specific
        'ctd.title': 'CTD Data Query',
        'ctd.search': 'Search CTD data',
        'ctd.depthProfile': 'Depth profile',
        'ctd.temperature': 'Temperature',
        'ctd.salinity': 'Salinity',
        'ctd.pressure': 'Pressure',
        'ctd.conductivity': 'Conductivity',
        'ctd.density': 'Density',
        'ctd.oxygen': 'Oxygen',
        'ctd.fluorescence': 'Fluorescence',
        'ctd.turbidity': 'Turbidity',
        'ctd.ph': 'pH',

        // WRF specific
        'wrf.title': 'WRF Data Query',
        'wrf.search': 'Search WRF data',
        'wrf.windDirection': 'Wind direction',
        'wrf.windSpeed': 'Wind speed',
        'wrf.pressure': 'Pressure',
        'wrf.precipitation': 'Precipitation',
        'wrf.relativeHumidity': 'Relative humidity',
        'wrf.snowAmount': 'Snow (amount)',
        'wrf.snowDepth': 'Snow (depth)',
        'wrf.seaSurfaceTemperature': 'Sea surface temperature',
        'wrf.airTemperature': 'Air temperature',
        'wrf.variable': 'Variable',
        'wrf.hour': 'Hour',

        // ROMS specific
        'roms.title': 'ROMS Data Query',
        'roms.search': 'Search ROMS data',
        'roms.salinity': 'Salinity',
        'roms.potentialTemperature': 'Potential temperature',
        'roms.velocityU': 'Velocity U',
        'roms.velocityV': 'Velocity V',
        'roms.seaSurfaceHeight': 'Sea surface height',
        'roms.depth': 'Depth',
        'roms.surface': 'Surface',

        // Vessel specific
        'vessel.title': 'Vessel Data Query',
        'vessel.search': 'Search vessel data',
        'vessel.speed': 'Speed',
        'vessel.heading': 'Heading',
        'vessel.course': 'Course over ground',
        'vessel.position': 'Position',
        'vessel.track': 'Track',

        // Meteostations specific
        'meteo.title': 'Meteorological Stations',
        'meteo.search': 'Search meteorological data',
        'meteo.temperature': 'Temperature',
        'meteo.humidity': 'Humidity',
        'meteo.pressure': 'Pressure',
        'meteo.wind': 'Wind',
        'meteo.precipitation': 'Precipitation',
        'meteo.radiation': 'Radiation',
        'meteo.snow': 'Snow',
        'meteo.station': 'Station',

        // Air quality specific
        'airquality.title': 'Air Quality',
        'airquality.search': 'Search air quality data',
        'airquality.pm25': 'PM2.5',
        'airquality.pm10': 'PM10',
        'airquality.no2': 'NO₂',
        'airquality.o3': 'O₃',
        'airquality.so2': 'SO₂',
        'airquality.co': 'CO',

        // Radiosounding specific
        'radio.title': 'Radiosounding',
        'radio.search': 'Search radiosounding data',
        'radio.skewT': 'Skew-T Diagram',
        'radio.hodograph': 'Hodograph',
        'radio.stuve': 'Stüve Diagram',
        'radio.tephigram': 'Tephigram',

        // Traffic specific
        'traffic.title': 'Traffic',
        'traffic.search': 'Search traffic data',
        'traffic.sensors': 'Sensors',
        'traffic.flow': 'Flow',
        'traffic.speed': 'Speed',
        'traffic.density': 'Density',

        // Empty states
        'empty.noData': 'No data to display',
        'empty.noResults': 'No results found for the selected criteria',
        'empty.configureFilters': 'Configure filters and press "{button}" to get results',
        'empty.tryAgain': 'Unable to retrieve data. Please try again later.',
        'empty.loading': 'Preparing results...',
        'empty.selectArea': 'Draw a rectangle on the map',
        'empty.noPeriods': 'No periods available',

        // Errors
        'error.generic': 'An error occurred',
        'error.loading': 'Error loading data',
        'error.processing': 'Error processing request',
        'error.network': 'Connection error',
        'error.timeout': 'Request timeout',
        'error.notFound': 'Not found',
        'error.unauthorized': 'Unauthorized',
        'error.forbidden': 'Access denied',
        'error.validation': 'Validation error',
        'error.server': 'Server error',
        'error.unknown': 'Unknown error',
        'error.retry': 'Please try again',

        // Notifications
        'notify.errorLoading': 'Error loading data',
        'notify.errorProcessTypes': 'Error loading process types',
        'notify.noResults': 'No results found',
        'notify.selectProcedure': 'Please enter a procedure',
        'notify.selectDates': 'Please select start and end dates',
    }
};

/**
 * Internationalization Manager
 */
const I18n = {
    /**
     * Current language
     * @private
     */
    _currentLang: 'eng',

    /**
     * Language change listeners
     * @private
     */
    _listeners: [],

    /**
     * Storage key for persisting language preference
     * @private
     */
    _storageKey: 'lendas-language',

    /**
     * Initialize the i18n module
     */
    init() {
        this._currentLang = 'eng';
        this._saveLanguage(this._currentLang);

        // Apply initial translations
        this._applyTranslations();
    },

    /**
     * Get saved language from localStorage
     * @private
     * @returns {string|null}
     */
    _getSavedLanguage() {
        try {
            return localStorage.getItem(this._storageKey);
        } catch {
            return null;
        }
    },

    /**
     * Save language preference to localStorage
     * @private
     * @param {string} lang
     */
    _saveLanguage(lang) {
        try {
            localStorage.setItem(this._storageKey, lang);
        } catch {
            // Ignore storage errors
        }
    },

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getLanguage() {
        return this._currentLang;
    },

    /**
     * Get list of available languages
     * @returns {Array<{code: string, name: string}>}
     */
    getAvailableLanguages() {
        return [
            { code: 'eng', name: this.t('lang.eng') }
        ];
    },

    /**
     * Set current language
     * @param {string} lang - Language code
     * @returns {boolean} Success
     */
    setLanguage(lang) {
        if (!TRANSLATIONS[lang]) {
            Logger.warn(`Language "${lang}" not available`);
            return false;
        }

        this._currentLang = lang;
        this._saveLanguage(lang);
        this._applyTranslations();
        this._notifyListeners();
        return true;
    },

    /**
     * Translate a key
     * @param {string} key - Translation key
     * @param {Object} [params] - Interpolation parameters
     * @returns {string} Translated text
     */
    t(key, params = {}) {
        const translation = TRANSLATIONS[this._currentLang]?.[key];

        if (!translation) {
            // Fallback to English for the static frontend
            const fallback = TRANSLATIONS.eng?.[key];
            if (!fallback) {
                Logger.warn(`Translation key "${key}" not found`);
                return key;
            }
            return this._interpolate(fallback, params);
        }

        return this._interpolate(translation, params);
    },

    /**
     * Interpolate parameters into translation string
     * @private
     * @param {string} str - Translation string
     * @param {Object} params - Parameters
     * @returns {string} Interpolated string
     */
    _interpolate(str, params) {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
        });
    },

    /**
     * Apply translations to DOM elements with data-i18n attributes
     * @private
     */
    _applyTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                el.textContent = this.t(key);
            }
        });

        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                el.placeholder = this.t(key);
            }
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) {
                el.title = this.t(key);
            }
        });

        // Update elements with data-i18n-aria-label attribute
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (key) {
                el.setAttribute('aria-label', this.t(key));
            }
        });

        // Update lang attribute on html element
        document.documentElement.lang = this._currentLang;
    },

    /**
     * Subscribe to language changes
     * @param {Function} callback - Function to call when language changes
     * @returns {Function} Unsubscribe function
     */
    onLanguageChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    },

    /**
     * Notify listeners of language change
     * @private
     */
    _notifyListeners() {
        this._listeners.forEach(callback => {
            try {
                callback(this._currentLang);
            } catch (error) {
                Logger.error('Error in i18n change listener:', error);
            }
        });
    },

    /**
     * Format date according to current locale
     * @param {Date|string|number} date - Date to format
     * @param {Object} [options] - Intl.DateTimeFormat options
     * @returns {string} Formatted date
     */
    formatDate(date, options = {}) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
            return '';
        }

        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };

        const locale = this._getLocale();
        return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    },

    /**
     * Format date and time according to current locale
     * @param {Date|string|number} date - Date to format
     * @param {Object} [options] - Intl.DateTimeFormat options
     * @returns {string} Formatted datetime
     */
    formatDateTime(date, options = {}) {
        return this.formatDate(date, {
            hour: '2-digit',
            minute: '2-digit',
            ...options
        });
    },

    /**
     * Format number according to current locale
     * @param {number} number - Number to format
     * @param {Object} [options] - Intl.NumberFormat options
     * @returns {string} Formatted number
     */
    formatNumber(number, options = {}) {
        if (typeof number !== 'number' || Number.isNaN(number)) {
            return '';
        }

        const locale = this._getLocale();
        return new Intl.NumberFormat(locale, options).format(number);
    },

    /**
     * Get locale string for current language
     * @private
     * @returns {string} Locale string
     */
    _getLocale() {
        const localeMap = {
            eng: 'en-US'
        };
        return localeMap[this._currentLang] || 'en-US';
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, TRANSLATIONS };
}

// Expose to global scope for browser
window.I18n = I18n;

