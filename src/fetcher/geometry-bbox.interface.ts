import { Geometry, GeometryCollection } from 'geojson';
import { BBox } from 'rbush';

export interface GeometryBbox extends BBox {
    geometry: Exclude<Geometry, GeometryCollection>;
}
