export const DATA_DIR = './data';
export const DOWNLOAD_DIR = `${DATA_DIR}/downloads`;
export const PACKAGE_DIR = `${DATA_DIR}/packages`;
export const TEMP_DIR = `${DATA_DIR}/temp`;
export const GEOJSON_PROJECTION = 'EPSG:4326';
export const POLYGON_COMPLEXITY_THRESHOLD = 500; // Number of points in polygon
export const AVG_POINTS_IN_SUBPOLYGON = POLYGON_COMPLEXITY_THRESHOLD / 4; // 4 min number of polygon in index
export const AVAILABLE_PACKAGES_FILE = `${PACKAGE_DIR}/tile-packages.json`;
