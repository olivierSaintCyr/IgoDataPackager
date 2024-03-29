import { MultiPolygon, Polygon } from 'geojson';
import { PolygonPreprocessingArgs } from './polygon-preprocessor-args.interface';
import simplify from '@turf/simplify';
import buffer from '@turf/buffer';


export class PolygonPreprocessor {
    constructor(private args: PolygonPreprocessingArgs) {}

    private getBufferOptions() {
        if (!this.args.buffer) {
            return { radius: undefined, units: undefined, steps: undefined }
        }
        return this.args.buffer;
    }

    process(polygon: Polygon | MultiPolygon): Polygon | MultiPolygon {
        const { radius, units, steps } = this.getBufferOptions();
        
        const buffered = buffer(polygon, radius, { units, steps });
        
        if (!this.args.simplify) {
            return buffered.geometry;
        }
    
        const simplified = simplify(buffered.geometry, this.args.simplify);
        return simplified;
    }
}
